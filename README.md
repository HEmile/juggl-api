# juggl-api
API for extending the Obsidian plugin Juggl.

To use it within your plugin:

- Run `npm i https://github.com/HEmile/juggl-api` in your plugin directory. Ensure it's a dependency, not a dev dependency. 

Check out `index.d.ts` for the exposed methods. You can start by accessing the plugin using `getPlugin`, then from the result (check if null!) use `activeGraphs` to get the currently active Juggl instances.  