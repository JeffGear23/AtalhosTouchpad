import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function runNativeAction(extension, action) {
    try {
        switch (action) {
        case 'quick-settings': {
            const menu = Main.panel?.statusArea?.quickSettings?.menu;
            if (menu?.open) {
                menu.open(true);
                return;
            }
            break;
        }
        case 'notifications': {
            const dateMenu = Main.panel?.statusArea?.dateMenu;
            const menu = dateMenu?.menu;
            if (menu?.toggle) {
                menu.toggle();
                return;
            }
            if (menu?.open) {
                menu.open(true);
                return;
            }
            break;
        }
        case 'files': {
            const homeUri = Gio.File.new_for_path(GLib.get_home_dir()).get_uri();
            if (Gio.AppInfo.launch_default_for_uri(homeUri, null))
                return;
            break;
        }
        case 'overview':
            if (Main.overview?.toggle) {
                Main.overview.toggle();
                return;
            }
            break;
        case 'apps':
            if (Main.overview?.show) {
                Main.overview.show();
                extension._addIdleCallback(() => {
                    const selector = Main.overview?.viewSelector;
                    if (selector?.showApps)
                        selector.showApps();
                    else if (selector?._showApps)
                        selector._showApps();
                    else if (selector?.setActivePage)
                        selector.setActivePage('apps');
                    else
                        extension._sendShortcut('97:64');
                    return GLib.SOURCE_REMOVE;
                });
                return;
            }
            break;
        case 'show-desktop':
            if (Main.wm?.actionMinimizeAll) {
                Main.wm.actionMinimizeAll();
                return;
            }
            break;
        case 'workspace-left':
        case 'workspace-right': {
            const active = global.workspace_manager?.get_active_workspace();
            const direction = action === 'workspace-left' ?
                Meta.MotionDirection.LEFT : Meta.MotionDirection.RIGHT;
            const neighbor = active?.get_neighbor?.(direction);
            if (neighbor?.activate) {
                neighbor.activate(global.get_current_time());
                return;
            }
            break;
        }
        case 'lock':
            if (Main.screenShield?.lock) {
                Main.screenShield.lock(false);
                return;
            }
            break;
        default:
            break;
        }

        const fallback = {
            'quick-settings': '115:64',
            notifications: '109:64',
            files: '101:64',
            overview: '65515:0',
            apps: '97:64',
            'show-desktop': '100:64',
            'workspace-left': '65365:64',
            'workspace-right': '65366:64',
            lock: '108:64',
        }[action];
        if (fallback)
            extension._sendShortcut(fallback);
    } catch (error) {
        logError(error, `[pincatouch] native action failed: ${action}`);
    }
}
