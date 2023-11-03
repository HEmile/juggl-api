(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('obsidian')) :
    typeof define === 'function' && define.amd ? define(['exports', 'obsidian'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["juggl-api"] = {}, global.obsidian));
})(this, (function (exports, obsidian) { 'use strict';

    const CAT_DANGLING = 'dangling';
    const CORE_STORE_ID = 'core';
    class VizId {
        constructor(id, storeId) {
            this.id = id;
            this.storeId = storeId;
        }
        toString() {
            return `${this.storeId}:${this.id}`;
        }
        toId() {
            return this.toString();
        }
        static fromId(id) {
            const split = id.split(':');
            const storeId = split[0];
            const _id = split.slice(1).join(':');
            return new VizId(_id, storeId);
        }
        static fromNode(node) {
            return VizId.fromId(node.id());
        }
        static fromNodes(nodes) {
            return nodes.map((n) => VizId.fromNode(n));
        }
        static fromFile(file) {
            return new VizId(file.name, 'core');
        }
        static toId(id, storeId) {
            return new VizId(id, storeId).toId();
        }
    }
    const _parseTags = function (tags) {
        return [].concat(...tags
            .map((tag) => {
            tag = tag.slice(1);
            const hSplit = tag.split('/');
            const tags = [];
            for (const i in hSplit) {
                const hTag = hSplit.slice(0, parseInt(i) + 1).join('-');
                tags.push(`tag-${hTag}`);
            }
            return tags;
        }));
    };
    const getClasses = function (file, metadataCache) {
        if (file) {
            const classes = [];
            if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].contains(file.extension)) {
                classes.push('image');
            }
            else if (['mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac'].contains(file.extension)) {
                classes.push('audio');
            }
            else if (['mp4', 'webm', 'ogv'].contains(file.extension)) {
                classes.push('video');
            }
            else if (file.extension === 'pdf') {
                classes.push('pdf');
            }
            // This is replaced by the 'path' data attribute.
            // if (!(file.parent.name === '/' || file.parent.name === '')) {
            //   classes.push(`folder-${file.parent.name
            //       .replace(' ', '_')}`);
            // } else {
            //   classes.push('root');
            // }
            if (file.extension === 'md') {
                classes.push('note');
                const cache = metadataCache.getFileCache(file);
                if (cache?.frontmatter) {
                    if ('image' in cache.frontmatter) {
                        classes.push('image');
                    }
                    if ('tags' in cache.frontmatter) {
                        const tags = obsidian.parseFrontMatterTags(cache.frontmatter);
                        if (tags) {
                            classes.push(..._parseTags(tags));
                        }
                    }
                    if ('cssclass' in cache.frontmatter) {
                        const clazzes = obsidian.parseFrontMatterStringArray(cache.frontmatter, 'cssclass');
                        if (clazzes) {
                            classes.push(...clazzes);
                        }
                    }
                }
                if (cache?.tags) {
                    classes.push(..._parseTags(cache.tags.map((t) => t.tag)));
                }
            }
            else {
                classes.push('file');
            }
            return classes;
        }
        return [CAT_DANGLING];
    };
    const nodeFromFile = async function (file, plugin, settings, id) {
        if (!id) {
            id = VizId.toId(file.name, CORE_STORE_ID);
        }
        const cache = plugin.app.metadataCache.getFileCache(file);
        const name = file.extension === 'md' ? file.basename : file.name;
        const classes = getClasses(file, plugin.app.metadataCache).join(' ');
        const data = {
            id,
            name,
            path: file.path,
        };
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].contains(file.extension)) {
            try {
                // @ts-ignore
                data['resource_url'] = `http://localhost:${plugin.settings.imgServerPort}/${encodeURI(file.path)}`;
            }
            catch { }
        }
        if (settings.readContent && file.extension == 'md') {
            data['content'] = await plugin.app.vault.cachedRead(file);
        }
        const frontmatter = cache?.frontmatter;
        if (frontmatter) {
            Object.keys(frontmatter).forEach((k) => {
                if (!(k === 'position')) {
                    if (k === 'image') {
                        const imageField = frontmatter[k];
                        try {
                            // Check if url. throws error otherwise
                            new URL(imageField);
                            data[k] = imageField;
                        }
                        catch {
                            try {
                                // @ts-ignore
                                data[k] = `http://localhost:${plugin.settings.imgServerPort}/${encodeURI(imageField)}`;
                            }
                            catch { }
                        }
                    }
                    else {
                        data[k] = frontmatter[k];
                    }
                }
            });
        }
        return {
            group: 'nodes',
            data: data,
            classes: classes,
        };
    };
    const nodeDangling = function (path) {
        return {
            group: 'nodes',
            data: {
                id: VizId.toId(path, CORE_STORE_ID),
                name: path,
            },
            classes: 'dangling',
        };
    };
    const wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';
    const nameRegex = '[^\\W\\d]\\w*';
    const regexEscape = function (str) {
        return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };
    const parseTypedLink = function (link, line, typedLinkPrefix) {
        // TODO: This is something specific I use, but shouldn't keep being in this repo.
        const regexPublishedIn = new RegExp(`^${regexEscape(typedLinkPrefix)} (publishedIn) (\\d\\d\\d\\d) (${wikilinkRegex},? *)+$`);
        const matchPI = regexPublishedIn.exec(line);
        if (!(matchPI === null)) {
            return {
                class: 'type-publishedIn',
                isInline: false,
                properties: {
                    year: matchPI[2],
                    context: '',
                    type: 'publishedIn',
                },
            };
        }
        // Intuition: Start with the typed link prefix. Then a neo4j name (nameRegex).
        // Then one or more of the wikilink group: wikilink regex separated by optional comma and multiple spaces
        const regex = new RegExp(`^${regexEscape(typedLinkPrefix)} (${nameRegex}) (${wikilinkRegex},? *)+$`);
        const match = regex.exec(line);
        const splitLink = link.original.split('|');
        let alias = null;
        if (splitLink.length > 1) {
            alias = splitLink.slice(1).join().slice(0, -2);
        }
        if (!(match === null)) {
            return {
                class: `type-${match[1]}`,
                isInline: false,
                properties: {
                    alias: alias,
                    context: '',
                    type: match[1],
                },
            };
        }
        return null;
    };
    const parseRefCache = function (ref, content, id, source, target, typedLinkPrefix) {
        const line = content[ref.position.start.line];
        let data = {
            id: id,
            source: source,
            target: target,
            context: line,
            edgeCount: 1,
            line: ref.position.start.line,
            start: ref.position.start.col,
            end: ref.position.end.col,
        };
        console.log(ref);
        const splitLink = ref.original.split('|');
        if (splitLink.length > 1) {
            data['alias'] = splitLink.slice(1).join().slice(0, -2);
        }
        let classes = '';
        const typedLink = parseTypedLink(ref, line, typedLinkPrefix);
        if (typedLink === null) {
            classes = `${classes} inline`;
        }
        else {
            data = { ...typedLink.properties, ...data };
            classes = `${classes} ${typedLink.class}`;
        }
        return {
            group: 'edges',
            data: data,
            classes: classes,
        };
    };

    const getPlugin = function (app) {
        // @ts-ignore
        if ('juggl' in app.plugins.plugins) {
            // @ts-ignore
            return app.plugins.plugins['juggl'];
        }
        return null;
    };
    const JUGGL_VIEW_TYPE = 'juggl_view';
    const JUGGL_NODES_VIEW_TYPE = 'juggl_nodes';
    const JUGGL_STYLE_VIEW_TYPE = 'juggl_style';
    const JUGGL_HELP_VIEW = 'juggl-help';

    exports.JUGGL_HELP_VIEW = JUGGL_HELP_VIEW;
    exports.JUGGL_NODES_VIEW_TYPE = JUGGL_NODES_VIEW_TYPE;
    exports.JUGGL_STYLE_VIEW_TYPE = JUGGL_STYLE_VIEW_TYPE;
    exports.JUGGL_VIEW_TYPE = JUGGL_VIEW_TYPE;
    exports.VizId = VizId;
    exports.getClasses = getClasses;
    exports.getPlugin = getPlugin;
    exports.nodeDangling = nodeDangling;
    exports.nodeFromFile = nodeFromFile;
    exports.parseRefCache = parseRefCache;
    exports.parseTypedLink = parseTypedLink;

}));
