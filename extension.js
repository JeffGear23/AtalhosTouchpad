import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import GestureController from './gesture-controller.js';

export default class AtalhosTouchpadExtension extends Extension {
    enable() {
        this._controller = new GestureController(this.getSettings());
        this._controller.enable();
    }

    disable() {
        if (this._controller) {
            this._controller.disable();
            this._controller = null;
        }
    }
}
