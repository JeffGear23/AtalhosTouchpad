import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.pincatouch';
const MODIFIER_KEYS = new Set([
    Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
    Gdk.KEY_Control_L, Gdk.KEY_Control_R,
    Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
    Gdk.KEY_Super_L, Gdk.KEY_Super_R,
    Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
    Gdk.KEY_Hyper_L, Gdk.KEY_Hyper_R,
]);
const ACCELERATOR_MASK =
    Gdk.ModifierType.SHIFT_MASK |
    Gdk.ModifierType.CONTROL_MASK |
    Gdk.ModifierType.ALT_MASK |
    Gdk.ModifierType.SUPER_MASK |
    Gdk.ModifierType.HYPER_MASK |
    Gdk.ModifierType.META_MASK;

const PRESETS = [
    ['Mostrar painel rápido', 'native:quick-settings'],
    ['Mostrar notificações', 'native:notifications'],
    ['Mostrar visão geral', 'native:overview'],
    ['Mostrar aplicativos', 'native:apps'],
    ['Arquivos', 'native:files'],
    ['Bloquear tela', 'native:lock'],
    ['Anterior', `${Gdk.KEY_Left}:${Gdk.ModifierType.ALT_MASK}`],
    ['Próximo', `${Gdk.KEY_Right}:${Gdk.ModifierType.ALT_MASK}`],
    ['Alternar aplicativos', `${Gdk.KEY_Tab}:${Gdk.ModifierType.ALT_MASK}`],
    ['Área de trabalho à esquerda', 'native:workspace-left'],
    ['Área de trabalho à direita', 'native:workspace-right'],
    ['Fechar janela', `${Gdk.KEY_F4}:${Gdk.ModifierType.ALT_MASK}`],
    ['Nova aba do navegador', `${Gdk.KEY_t}:${Gdk.ModifierType.CONTROL_MASK}`],
    ['Fechar aba do navegador', `${Gdk.KEY_w}:${Gdk.ModifierType.CONTROL_MASK}`],
    ['Aba anterior', `${Gdk.KEY_Tab}:${Gdk.ModifierType.CONTROL_MASK | Gdk.ModifierType.SHIFT_MASK}`],
    ['Próxima aba', `${Gdk.KEY_Tab}:${Gdk.ModifierType.CONTROL_MASK}`],
    ['Aumentar volume', `${Gdk.KEY_AudioRaiseVolume}:0`],
    ['Diminuir volume', `${Gdk.KEY_AudioLowerVolume}:0`],
    ['Aumentar brilho', `${Gdk.KEY_MonBrightnessUp}:0`],
    ['Diminuir brilho', `${Gdk.KEY_MonBrightnessDown}:0`],
    ['Captura de tela', `${Gdk.KEY_Print}:0`],
];

export default class PincaTouchPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
        this.initTranslations('pincatouch@manus.local');
    }

    fillPreferencesWindow(window) {
        window.set_default_size(600, 620);
        window.set_title(_('AtalhosTouchpad'));

        const settings = this.getSettings(SCHEMA_ID);
        const page = new Adw.PreferencesPage({
            title: _('Pinças'),
            icon_name: 'input-touchpad-symbolic',
        });
        window.add(page);

        for (const [fingers, label] of [[2, _('2 dedos')], [3, _('3 dedos')], [4, _('4 dedos')]]) {
            const group = new Adw.PreferencesGroup({
                title: _('Pinça com %s').format(label),
                description: _('Escolha uma combinação de teclas para cada direção.'),
            });
            page.add(group);
            this._addShortcutRow(window, group, settings,
                `${this._name(fingers)}-pinch-in-shortcut`, _('Pinça para dentro'));
            this._addShortcutRow(window, group, settings,
                `${this._name(fingers)}-pinch-out-shortcut`, _('Pinça para fora'));
        }

        const gesturesPage = new Adw.PreferencesPage({
            title: _('Gestos'),
            icon_name: 'input-touchpad-symbolic',
        });
        window.add(gesturesPage);

        const swipe3 = new Adw.PreferencesGroup({
            title: _('Swipe com 3 dedos'),
            description: _('Configure os gestos para cima, baixo, esquerda e direita.'),
        });
        gesturesPage.add(swipe3);
        for (const [direction, label] of [
            ['up', _('Swipe para cima')],
            ['down', _('Swipe para baixo')],
            ['left', _('Swipe para a esquerda')],
            ['right', _('Swipe para a direita')],
        ]) {
            this._addShortcutRow(window, swipe3, settings,
                `three-swipe-${direction}-shortcut`, label);
        }

        const swipe4 = new Adw.PreferencesGroup({
            title: _('Swipe com 4 dedos'),
            description: _('Configure os gestos para cima, baixo, esquerda e direita.'),
        });
        gesturesPage.add(swipe4);
        for (const [direction, label] of [
            ['up', _('Swipe para cima')],
            ['down', _('Swipe para baixo')],
            ['left', _('Swipe para a esquerda')],
            ['right', _('Swipe para a direita')],
        ]) {
            this._addShortcutRow(window, swipe4, settings,
                `four-swipe-${direction}-shortcut`, label);
        }

        const tapPage = new Adw.PreferencesPage({
            title: _('Toque'),
            icon_name: 'input-touchpad-symbolic',
        });
        window.add(tapPage);
        const tap4 = new Adw.PreferencesGroup({title: _('Toque com 4 dedos')});
        tap4.description = _('Defina quanto tempo o toque pode durar para ser reconhecido.');
        tapPage.add(tap4);
        this._addShortcutRow(window, tap4, settings, 'four-tap-shortcut',
            _('Toque com 4 dedos'));
        this._addTapSensitivityRow(tap4, settings);
        this._addTapDurationModeRow(tap4, settings);

        const topBarPage = new Adw.PreferencesPage({
            title: _('Top Bar'),
            icon_name: 'go-up-symbolic',
        });
        window.add(topBarPage);
        const recommendation = new Adw.PreferencesGroup();
        const recommendationRow = new Adw.ActionRow({
            title: _('Recomendação'),
            subtitle: _('Para volume e brilho, prefira as predefinições Aumentar volume, Diminuir volume, Aumentar brilho e Diminuir brilho. Elas usam as teclas multimídia padrão do GNOME e funcionam independentemente do aplicativo ativo.'),
        });
        recommendation.add(recommendationRow);
        topBarPage.add(recommendation);
        for (const [region, title] of [
            ['left', _('Top Bar — esquerda')],
            ['right', _('Top Bar — direita')],
        ]) {
            const regionGroup = new Adw.PreferencesGroup({
                title,
                description: _('Um espaço sem atalho mantém a rolagem normal do GNOME.'),
            });
            topBarPage.add(regionGroup);
            this._addShortcutRow(window, regionGroup, settings,
                `topbar-${region}-scroll-up-shortcut`, _('Rolar para cima'));
            this._addShortcutRow(window, regionGroup, settings,
                `topbar-${region}-scroll-down-shortcut`, _('Rolar para baixo'));
        }
        const topBarSensitivity = new Adw.PreferencesGroup({
            title: _('Sensibilidade'),
        });
        topBarPage.add(topBarSensitivity);
        this._addTopBarSensitivityRow(topBarSensitivity, settings);
    }

    _name(fingers) {
        return fingers === 2 ? 'two' : fingers === 3 ? 'three' : 'four';
    }

    _presetLabel(label) {
        const labels = {
            'Mostrar painel rápido': _('Mostrar painel rápido'),
            'Mostrar visão geral': _('Mostrar visão geral'),
            'Mostrar aplicativos': _('Mostrar aplicativos'),
            'Arquivos': _('Arquivos'),
            'Área de trabalho à esquerda': _('Área de trabalho à esquerda'),
            'Área de trabalho à direita': _('Área de trabalho à direita'),
            'Alternar aplicativos': _('Alternar aplicativos'),
            'Fechar janela': _('Fechar janela'),
            'Anterior': _('Anterior'),
            'Próximo': _('Próximo'),
            'Aba anterior': _('Aba anterior'),
            'Próxima aba': _('Próxima aba'),
            'Mostrar notificações': _('Mostrar notificações'),
            'Nova aba do navegador': _('Nova aba do navegador'),
            'Fechar aba do navegador': _('Fechar aba do navegador'),
            'Bloquear tela': _('Bloquear tela'),
            'Captura de tela': _('Captura de tela'),
            'Aumentar volume': _('Aumentar volume'),
            'Diminuir volume': _('Diminuir volume'),
            'Aumentar brilho': _('Aumentar brilho'),
            'Diminuir brilho': _('Diminuir brilho'),
        };
        return labels[label] ?? label;
    }

    _addTapSensitivityRow(group, settings) {
        const row = new Adw.ActionRow({
            title: _('Sensibilidade do toque com 4 dedos'),
            subtitle: '',
        });
        const scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.1, 250, 0.1);
        scale.digits = 1;
        scale.draw_value = true;
        scale.value_pos = Gtk.PositionType.RIGHT;
        scale.width_request = 260;
        scale.hexpand = false;
        row.add_suffix(scale);
        group.add(row);

        const sync = () => {
            const current = settings.get_double('four-tap-max-duration');
            const value = current >= 0.1 && current <= 250 ? current : 250;
            row.subtitle = _('O toque será reconhecido até %s ms.').format(value.toFixed(1));
        };
        settings.bind('four-tap-max-duration', scale, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.connect('changed::four-tap-max-duration', sync);
        scale.connect('value-changed', () => {
            Gio.Settings.sync();
        });
        sync();
    }

    _addTopBarSensitivityRow(group, settings) {
        const row = new Adw.ActionRow({
            title: _('Sensibilidade da rolagem'),
            subtitle: '',
        });
        const scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.1, 5, 0.1);
        scale.digits = 1;
        scale.draw_value = true;
        scale.value_pos = Gtk.PositionType.RIGHT;
        scale.width_request = 260;
        scale.hexpand = false;
        row.add_suffix(scale);
        group.add(row);

        const sync = () => {
            const current = settings.get_double('topbar-scroll-sensitivity');
            const value = current >= 0.1 && current <= 5 ? current : 1;
            row.subtitle = _('O valor %s mantém o comportamento atual.').format(`${value.toFixed(1).replace('.', ',')}x`);
        };
        settings.bind('topbar-scroll-sensitivity', scale, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.connect('changed::topbar-scroll-sensitivity', sync);
        scale.connect('value-changed', () => {
            Gio.Settings.sync();
        });
        sync();
    }

    _addTapDurationModeRow(group, settings) {
        const row = new Adw.ActionRow({
            title: _('Modo de reconhecimento'),
            subtitle: _('Escolha se o limite de duração deve ser aplicado.'),
        });
        const labels = Gtk.StringList.new([
            _('Usar limite de duração'),
            _('Aceitar qualquer duração'),
        ]);
        const dropdown = Gtk.DropDown.new(labels, null);
        dropdown.width_request = 220;
        dropdown.valign = Gtk.Align.CENTER;
        row.add_suffix(dropdown);
        group.add(row);

        let syncing = true;
        const sync = () => {
            syncing = true;
            dropdown.selected = settings.get_string('four-tap-duration-mode') === 'unlimited' ? 1 : 0;
            syncing = false;
        };
        settings.connect('changed::four-tap-duration-mode', sync);
        dropdown.connect('notify::selected', () => {
            if (syncing)
                return;
            settings.set_string('four-tap-duration-mode', dropdown.selected === 1 ? 'unlimited' : 'limited');
        });
        sync();
    }

    _addShortcutRow(parent, group, settings, key, title) {
        const row = new Adw.ActionRow({
            title,
            subtitle: this._formatShortcut(settings.get_string(key)),
        });
        const labels = PRESETS.map(([label]) => this._presetLabel(label));
        labels.push(_('Atalho personalizado…'));
        const dropdown = Gtk.DropDown.new(Gtk.StringList.new(labels), null);
        dropdown.valign = Gtk.Align.CENTER;
        dropdown.width_request = 190;
        const recordButton = new Gtk.Button({
            label: _('Gravar'),
            valign: Gtk.Align.CENTER,
            visible: false,
        });
        const clearButton = new Gtk.Button({
            label: _('Limpar'),
            valign: Gtk.Align.CENTER,
        });
        row.add_suffix(dropdown);
        row.add_suffix(recordButton);
        row.add_suffix(clearButton);
        group.add(row);

        const customIndex = PRESETS.length;
        let syncing = true;
        const syncDropdown = () => {
            const current = settings.get_string(key);
            syncing = true;
            const index = PRESETS.findIndex(([, value]) => value === current);
            dropdown.selected = index >= 0 ? index : customIndex;
            recordButton.visible = index < 0;
            row.subtitle = this._formatShortcut(current);
            syncing = false;
        };

        settings.connect(`changed::${key}`, () => {
            syncDropdown();
        });
        clearButton.connect('clicked', () => settings.set_string(key, ''));
        recordButton.connect('clicked', () => this._recordShortcut(parent, settings, key));
        dropdown.connect('notify::selected', () => {
            if (syncing)
                return;
            const selected = dropdown.selected;
            if (selected < PRESETS.length) {
                recordButton.visible = false;
                settings.set_string(key, PRESETS[selected][1]);
            } else {
                recordButton.visible = true;
                this._recordShortcut(parent, settings, key, syncDropdown);
            }
        });
        syncDropdown();
    }

    _recordShortcut(parent, settings, key, onCancel = null) {
        const dialog = new Gtk.Window({
            title: _('Gravar atalho'),
            modal: true,
            transient_for: parent,
            default_width: 420,
            default_height: 180,
            resizable: false,
        });
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });
        box.append(new Gtk.Label({
            label: _('Pressione a combinação de teclas desejada'),
            css_classes: ['title-3'],
        }));
        const hint = new Gtk.Label({label: _('Esc cancela'), css_classes: ['dim-label']});
        box.append(hint);
        dialog.set_child(box);

        let captured = false;
        const controller = new Gtk.EventControllerKey();
        controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
        dialog.add_controller(controller);
        controller.connect('key-pressed', (_controller, keyval, _keycode, state) => {
            if (captured)
                return true;
            const modifiers = state & ACCELERATOR_MASK;
            if (keyval === Gdk.KEY_Escape && modifiers === 0) {
                dialog.close();
                onCancel?.();
                return true;
            }
            if (MODIFIER_KEYS.has(keyval)) {
                hint.label = this._formatModifiers(modifiers) ||
                    _('Pressione uma tecla não modificadora');
                return true;
            }
            captured = true;
            const normalizedKeyval = this._normalizeKeyval(keyval, modifiers);
            settings.set_string(key, `${normalizedKeyval}:${modifiers}`);
            dialog.close();
            return true;
        });
        dialog.present();
    }

    _formatModifiers(modifiers) {
        const names = [];
        if (modifiers & Gdk.ModifierType.CONTROL_MASK) names.push('Ctrl');
        if (modifiers & Gdk.ModifierType.ALT_MASK) names.push('Alt');
        if (modifiers & Gdk.ModifierType.SHIFT_MASK) names.push('Shift');
        if (modifiers & Gdk.ModifierType.SUPER_MASK) names.push('Super');
        if (modifiers & Gdk.ModifierType.HYPER_MASK) names.push('Hyper');
        if (modifiers & Gdk.ModifierType.META_MASK) names.push('Meta');
        return names.join(' + ');
    }

    _formatShortcut(value) {
        if (!value || !value.includes(':'))
            return _('Não configurado');
        const [keyval, modifiers] = value.split(':').map(Number);
        return Gtk.accelerator_get_label(keyval, modifiers) || value;
    }

    _normalizeKeyval(keyval, modifiers) {
        // On several layouts GTK reports Shift+, and Shift+. as the already
        // shifted keyvals '<' and '>'. Store the physical base key plus the
        // Shift modifier so the shell sends the intended combination.
        if (modifiers & Gdk.ModifierType.SHIFT_MASK) {
            if (keyval === Gdk.KEY_less)
                return Gdk.KEY_comma;
            if (keyval === Gdk.KEY_greater)
                return Gdk.KEY_period;
        }
        return keyval;
    }
}
