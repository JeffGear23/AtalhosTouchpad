import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {runNativeAction} from './native-actions.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.pincatouch';
const PINCH_THRESHOLD = 0.12;
const SWIPE_THRESHOLD = 15;
const DEFAULT_TAP_MAX_DURATION_MS = 500.0;
const MIN_TAP_MAX_DURATION_MS = 0.1;
const MAX_TAP_MAX_DURATION_MS = 250.0;
const DEFAULT_TOPBAR_SCROLL_SENSITIVITY = 1.0;
const MIN_TOPBAR_SCROLL_SENSITIVITY = 0.1;
const MAX_TOPBAR_SCROLL_SENSITIVITY = 5.0;
const DEBUG = false;

export default class PincaTouchExtension extends Extension {
    enable() {
        this._settings = this.getSettings(SCHEMA_ID);
        this._migrateTapDurationSetting();
        this._migrateTopBarShortcuts();
        this._stageSignalId = null;
        this._topBarSignalId = null;
        this._topBarScrollAccum = 0;
        this._topBarScrollAccumKey = null;
        this._idleSourceIds = new Set();
        this._pinchEventType = Clutter.EventType.TOUCHPAD_PINCH;
        this._gesturePhases = Clutter.TouchpadGesturePhase;
        if (this._pinchEventType === undefined || !this._gesturePhases) {
            log('[pincatouch] TOUCHPAD_PINCH API is unavailable in this GNOME Shell');
            return;
        }
        this._keyboard = Clutter.get_default_backend().get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        this._pinchDirection = null;
        this._pinchFingers = null;
        this._swipeDx = 0;
        this._swipeDy = 0;
        this._swipeFingers = null;
        this._swipeStartTime = 0;
        this._swipeKey = null;
        this._swipeHandled = false;
        this._holdFingers = null;
        this._holdStartTime = 0;
        this._stageSignalId = global.stage.connect(
            'captured-event',
            (_actor, event) => this._onTouchpadEvent(event),
        );
        if (Main.panel) {
            this._topBarSignalId = Main.panel.connect(
                'scroll-event',
                (_actor, event) => this._onTopBarScroll(event),
            );
        }

        if (DEBUG)
            log('[pincatouch] enabled; waiting for two-, three- or four-finger pinch');
    }

    disable() {
        if (this._stageSignalId !== null) {
            global.stage.disconnect(this._stageSignalId);
            this._stageSignalId = null;
        }
        if (this._topBarSignalId !== null && Main.panel) {
            Main.panel.disconnect(this._topBarSignalId);
            this._topBarSignalId = null;
        }
        this._topBarScrollAccum = 0;
        this._topBarScrollAccumKey = null;
        for (const sourceId of this._idleSourceIds)
            GLib.Source.remove(sourceId);
        this._idleSourceIds.clear();

        this._pinchDirection = null;
        this._pinchFingers = null;
        this._swipeDx = 0;
        this._swipeDy = 0;
        this._swipeFingers = null;
        this._swipeStartTime = 0;
        this._swipeKey = null;
        this._swipeHandled = false;
        this._holdFingers = null;
        this._holdStartTime = 0;
        this._pinchEventType = null;
        this._gesturePhases = null;
        this._keyboard = null;
        this._settings = null;
    }

    _onTouchpadEvent(event) {
        const type = event.type();
        if (type === this._pinchEventType)
            return this._onPinchEvent(event);
        if (type === Clutter.EventType.TOUCHPAD_SWIPE)
            return this._onSwipeEvent(event);
        if (type === Clutter.EventType.TOUCHPAD_HOLD)
            return this._onHoldEvent(event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onTopBarScroll(event) {
        if (typeof event.get_scroll_direction !== 'function')
            return Clutter.EVENT_PROPAGATE;

        let direction = event.get_scroll_direction();
        let signedDelta = 0;
        if (direction === Clutter.ScrollDirection.SMOOTH) {
            if (typeof event.get_scroll_delta !== 'function')
                return Clutter.EVENT_PROPAGATE;
            const [dx, dy] = event.get_scroll_delta();
            if (dy === 0 || Math.abs(dy) <= Math.abs(dx))
                return Clutter.EVENT_PROPAGATE;
            direction = dy < 0 ? Clutter.ScrollDirection.UP : Clutter.ScrollDirection.DOWN;
            signedDelta = dy < 0 ? -Math.abs(dy) : Math.abs(dy);
        } else if (direction === Clutter.ScrollDirection.UP) {
            signedDelta = -1;
        } else if (direction === Clutter.ScrollDirection.DOWN) {
            signedDelta = 1;
        }

        if (direction !== Clutter.ScrollDirection.UP &&
            direction !== Clutter.ScrollDirection.DOWN)
            return Clutter.EVENT_PROPAGATE;

        const region = this._getTopBarRegion(event);
        if (!region) {
            this._topBarScrollAccum = 0;
            this._topBarScrollAccumKey = null;
            return Clutter.EVENT_PROPAGATE;
        }
        const vertical = direction === Clutter.ScrollDirection.UP ? 'up' : 'down';
        const key = `topbar-${region}-scroll-${vertical}-shortcut`;
        if (!this._settings.get_string(key)) {
            this._topBarScrollAccum = 0;
            this._topBarScrollAccumKey = null;
            return Clutter.EVENT_PROPAGATE;
        }

        const configuredSensitivity = this._settings.get_double('topbar-scroll-sensitivity');
        const sensitivity = configuredSensitivity >= MIN_TOPBAR_SCROLL_SENSITIVITY &&
            configuredSensitivity <= MAX_TOPBAR_SCROLL_SENSITIVITY ?
            configuredSensitivity : DEFAULT_TOPBAR_SCROLL_SENSITIVITY;
        if (this._topBarScrollAccumKey !== key) {
            this._topBarScrollAccum = 0;
            this._topBarScrollAccumKey = key;
        }
        if (this._topBarScrollAccum !== 0 &&
            Math.sign(this._topBarScrollAccum) !== Math.sign(signedDelta))
            this._topBarScrollAccum = 0;
        this._topBarScrollAccum += signedDelta * sensitivity;
        if (Math.abs(this._topBarScrollAccum) >= 1) {
            this._topBarScrollAccum = 0;
            this._scheduleSettingShortcut(key);
        }
        return Clutter.EVENT_STOP;
    }

    _getTopBarRegion(event) {
        if (typeof event.get_coords !== 'function' || !Main.panel)
            return null;
        const [x] = event.get_coords();
        if (!Number.isFinite(x))
            return null;
        try {
            const [panelX] = Main.panel.get_transformed_position();
            const [panelWidth] = Main.panel.get_transformed_size();
            if (Number.isFinite(panelX) && Number.isFinite(panelWidth) && panelWidth > 0)
                return x < panelX + panelWidth / 2 ? 'left' : 'right';
        } catch (error) {
            logError(error, '[pincatouch] could not determine Top Bar region');
        }
        return null;
    }

    _migrateTopBarShortcuts() {
        if (this._settings.get_boolean('topbar-zones-migrated'))
            return;
        const up = this._settings.get_string('topbar-scroll-up-shortcut');
        const down = this._settings.get_string('topbar-scroll-down-shortcut');
        if (up) {
            this._settings.set_string('topbar-left-scroll-up-shortcut', up);
            this._settings.set_string('topbar-right-scroll-up-shortcut', up);
        }
        if (down) {
            this._settings.set_string('topbar-left-scroll-down-shortcut', down);
            this._settings.set_string('topbar-right-scroll-down-shortcut', down);
        }
        this._settings.set_boolean('topbar-zones-migrated', true);
    }

    _onPinchEvent(event) {
        if (typeof event.get_touchpad_gesture_finger_count !== 'function' ||
            typeof event.get_gesture_phase !== 'function')
            return Clutter.EVENT_PROPAGATE;

        const fingers = event.get_touchpad_gesture_finger_count();
        if (![2, 3, 4].includes(fingers))
            return Clutter.EVENT_PROPAGATE;

        const phase = event.get_gesture_phase();

        const phases = this._gesturePhases;
        if (phase === phases.BEGIN) {
            this._pinchDirection = null;
            this._pinchFingers = fingers;
            if (DEBUG)
                log(`[pincatouch] TOUCHPAD_PINCH BEGIN: ${fingers} fingers`);
            return Clutter.EVENT_STOP;
        }

        if (phase === phases.UPDATE) {
            if (typeof event.get_gesture_pinch_scale !== 'function')
                return Clutter.EVENT_PROPAGATE;
            const scale = event.get_gesture_pinch_scale();
            const delta = scale - 1.0;

            if (this._pinchDirection === null &&
                Math.abs(delta) >= PINCH_THRESHOLD) {
                this._pinchDirection = delta < 0 ? 'in' : 'out';
                if (DEBUG)
                    log(`[pincatouch] pinch-${this._pinchDirection}, scale=${scale.toFixed(3)}`);
            }
            return Clutter.EVENT_STOP;
        }

        if (phase === phases.END) {
            const direction = this._pinchDirection;
            const gestureFingers = this._pinchFingers;
            this._pinchDirection = null;
            this._pinchFingers = null;
            if (DEBUG)
                log(`[pincatouch] TOUCHPAD_PINCH END: ${gestureFingers ?? fingers} fingers, ${direction ?? 'below threshold'}`);
            if (direction)
                this._scheduleShortcut(gestureFingers, direction);
            return Clutter.EVENT_STOP;
        }

        if (phase === phases.CANCEL) {
            this._pinchDirection = null;
            this._pinchFingers = null;
            if (DEBUG)
                log('[pincatouch] TOUCHPAD_PINCH CANCEL');
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_STOP;
    }

    _onSwipeEvent(event) {
        if (typeof event.get_touchpad_gesture_finger_count !== 'function' ||
            typeof event.get_gesture_phase !== 'function')
            return Clutter.EVENT_PROPAGATE;

        const fingers = event.get_touchpad_gesture_finger_count();
        if (fingers !== 3 && fingers !== 4)
            return Clutter.EVENT_PROPAGATE;

        const phase = event.get_gesture_phase();
        const phases = this._gesturePhases;
        if (phase === phases.BEGIN) {
            this._swipeDx = 0;
            this._swipeDy = 0;
            this._swipeFingers = fingers;
            this._swipeStartTime = GLib.get_monotonic_time();
            this._swipeKey = null;
            this._swipeHandled = false;
            return Clutter.EVENT_PROPAGATE;
        }

        if (phase === phases.UPDATE) {
            if (typeof event.get_gesture_motion_delta !== 'function')
                return Clutter.EVENT_PROPAGATE;
            const [dx, dy] = event.get_gesture_motion_delta();
            this._swipeDx += dx;
            this._swipeDy += dy;
            if (!this._swipeKey &&
                Math.max(Math.abs(this._swipeDx), Math.abs(this._swipeDy)) >= SWIPE_THRESHOLD) {
                const direction = Math.abs(this._swipeDx) >= Math.abs(this._swipeDy) ?
                    (this._swipeDx > 0 ? 'right' : 'left') :
                    (this._swipeDy > 0 ? 'down' : 'up');
                const prefix = this._swipeFingers === 3 ? 'three' : 'four';
                this._swipeKey = `${prefix}-swipe-${direction}-shortcut`;
                this._swipeHandled = Boolean(this._settings.get_string(this._swipeKey));
            }
            return this._swipeHandled ? Clutter.EVENT_STOP : Clutter.EVENT_PROPAGATE;
        }

        if (phase === phases.END || phase === phases.CANCEL) {
            const dx = this._swipeDx;
            const dy = this._swipeDy;
            const gestureFingers = this._swipeFingers ?? fingers;
            const elapsed = (GLib.get_monotonic_time() - this._swipeStartTime) / 1000;
            this._swipeDx = 0;
            this._swipeDy = 0;
            this._swipeFingers = null;
            this._swipeStartTime = 0;
            const handled = this._swipeHandled;
            const swipeKey = this._swipeKey;
            this._swipeKey = null;
            this._swipeHandled = false;

            if (phase === phases.END && handled && swipeKey)
                this._scheduleSettingShortcut(swipeKey);
            return handled ? Clutter.EVENT_STOP : Clutter.EVENT_PROPAGATE;
        }

        return Clutter.EVENT_STOP;
    }

    _onHoldEvent(event) {
        if (typeof event.get_touchpad_gesture_finger_count !== 'function' ||
            typeof event.get_gesture_phase !== 'function')
            return Clutter.EVENT_PROPAGATE;

        const fingers = event.get_touchpad_gesture_finger_count();
        if (fingers !== 4)
            return Clutter.EVENT_PROPAGATE;

        const phase = event.get_gesture_phase();
        const phases = this._gesturePhases;
        if (phase === phases.BEGIN) {
            if (!this._settings.get_string('four-tap-shortcut'))
                return Clutter.EVENT_PROPAGATE;
            this._holdFingers = fingers;
            this._holdStartTime = GLib.get_monotonic_time();
            return Clutter.EVENT_STOP;
        }
        if (phase === phases.END) {
            if (this._holdFingers === null)
                return Clutter.EVENT_PROPAGATE;
            const elapsed = (GLib.get_monotonic_time() - this._holdStartTime) / 1000;
            this._holdFingers = null;
            this._holdStartTime = 0;
            const mode = this._settings.get_string('four-tap-duration-mode');
            const configuredLimit = this._settings.get_double('four-tap-max-duration');
            const maxDuration = configuredLimit >= MIN_TAP_MAX_DURATION_MS &&
                configuredLimit <= MAX_TAP_MAX_DURATION_MS ? configuredLimit : DEFAULT_TAP_MAX_DURATION_MS;
            if (mode === 'unlimited' || elapsed <= maxDuration)
                this._scheduleSettingShortcut('four-tap-shortcut');
            return Clutter.EVENT_STOP;
        }
        if (phase === phases.CANCEL) {
            if (this._holdFingers === null)
                return Clutter.EVENT_PROPAGATE;
            this._holdFingers = null;
            this._holdStartTime = 0;
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_STOP;
    }

    _migrateTapDurationSetting() {
        if (!this._settings.get_boolean('four-tap-duration-migrated')) {
            const legacyValue = this._settings.get_int('four-tap-max-duration-ms');
            if (legacyValue !== 500) {
                const migratedValue = Math.max(MIN_TAP_MAX_DURATION_MS,
                    Math.min(MAX_TAP_MAX_DURATION_MS, legacyValue));
                this._settings.set_double('four-tap-max-duration', migratedValue);
            }
            this._settings.set_boolean('four-tap-duration-migrated', true);
        }

        const currentValue = this._settings.get_double('four-tap-max-duration');
        if (currentValue < MIN_TAP_MAX_DURATION_MS || currentValue > MAX_TAP_MAX_DURATION_MS) {
            const clampedValue = Math.max(MIN_TAP_MAX_DURATION_MS,
                Math.min(MAX_TAP_MAX_DURATION_MS, currentValue));
            this._settings.set_double('four-tap-max-duration', clampedValue);
        }
    }

    _scheduleShortcut(fingers, direction) {
        const fingerName = fingers === 2 ? 'two' : fingers === 3 ? 'three' : 'four';
        this._scheduleSettingShortcut(`${fingerName}-pinch-${direction}-shortcut`);
    }

    _scheduleSettingShortcut(key) {
        const shortcut = this._settings.get_string(key);
        if (!shortcut)
            return;

        this._addIdleCallback(() => {
            if (!this._keyboard || !this._settings)
                return GLib.SOURCE_REMOVE;
            if (shortcut.startsWith('native:'))
                runNativeAction(this, shortcut.slice('native:'.length));
            else
                this._sendShortcut(shortcut);
            return GLib.SOURCE_REMOVE;
        });
    }

    _addIdleCallback(callback) {
        let sourceId = 0;
        sourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._idleSourceIds.delete(sourceId);
            return callback();
        });
        this._idleSourceIds.add(sourceId);
    }

    _sendShortcut(shortcut) {
        const [keyvalText, modifierText] = shortcut.split(':');
        const keyval = Number(keyvalText);
        const modifiers = Number(modifierText);
        if (!Number.isInteger(keyval) || !Number.isInteger(modifiers))
            return;

        const timestamp = Clutter.get_current_event_time();
        const pressed = [];
        const addModifier = (mask, key) => {
            if (modifiers & mask) {
                this._keyboard.notify_keyval(timestamp, key, Clutter.KeyState.PRESSED);
                pressed.push(key);
            }
        };

        // GDK modifier masks used by the preferences process.
        addModifier(1, Clutter.KEY_Shift_L);
        addModifier(4, Clutter.KEY_Control_L);
        addModifier(8, Clutter.KEY_Alt_L);
        addModifier(64, Clutter.KEY_Super_L);
        addModifier(128, Clutter.KEY_Hyper_L);
        addModifier(256, Clutter.KEY_Meta_L);

        this._keyboard.notify_keyval(timestamp, keyval, Clutter.KeyState.PRESSED);
        this._keyboard.notify_keyval(timestamp, keyval, Clutter.KeyState.RELEASED);

        for (let i = pressed.length - 1; i >= 0; i--)
            this._keyboard.notify_keyval(timestamp, pressed[i], Clutter.KeyState.RELEASED);
    }
}
