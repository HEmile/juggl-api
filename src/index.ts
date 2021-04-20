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
