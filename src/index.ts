import {IJugglPlugin} from '../index';
import {App} from 'obsidian';

export {VizId, getClasses, nodeFromFile, nodeDangling, parseRefCache, parseTypedLink} from './utils';

export const getPlugin = function(app: App): IJugglPlugin | null {
  // @ts-ignore
  if ('juggl' in app.plugins.plugins) {
    // @ts-ignore
    return app.plugins.plugins['juggl'] as IJugglPlugin;
  }
  return null;
};

export const JUGGL_VIEW_TYPE = 'juggl_view';
export const JUGGL_NODES_VIEW_TYPE = 'juggl_nodes';
export const JUGGL_STYLE_VIEW_TYPE = 'juggl_style';
export const JUGGL_HELP_VIEW = 'juggl-help';

