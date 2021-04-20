import type {
  EdgeDataDefinition,
  EdgeDefinition,
  NodeCollection,
  NodeDataDefinition,
  NodeDefinition,
  NodeSingular,
} from 'cytoscape';
import type {TagCache, TFile, Plugin, ReferenceCache} from 'obsidian';
import {MetadataCache, parseFrontMatterStringArray, parseFrontMatterTags} from 'obsidian';
import {ITypedLink, ITypedLinkProperties} from '../index';

const CAT_DANGLING = 'dangling';
const CORE_STORE_ID = 'core';

export class VizId {
    id: string;
    storeId: string;
    constructor(id: string, storeId: string) {
      this.id = id;
      this.storeId = storeId;
    }

    toString(): string {
      return `${this.storeId}:${this.id}`;
    }

    toId(): string {
      return this.toString();
    }

    static fromId(id: string): VizId {
      const split = id.split(':');
      const storeId = split[0];
      const _id = split.slice(1).join(':');
      return new VizId(_id, storeId);
    }

    static fromNode(node: NodeSingular): VizId {
      return VizId.fromId(node.id());
    }

    static fromNodes(nodes: NodeCollection) : VizId[] {
      return nodes.map((n) => VizId.fromNode(n));
    }

    static fromFile(file: TFile): VizId {
      return new VizId(file.name, 'core');
    }

    static toId(id: string, storeId: string) : string {
      return new VizId(id, storeId).toId();
    }
}

const _parseTags = function(tags: string[]): string[] {
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

export const getClasses = function(file: TFile, metadataCache: MetadataCache): string[] {
  if (file) {
    const classes = [];
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].contains(file.extension)) {
      classes.push('image');
    } else if (['mp3', 'webm', 'wav', 'm4a', 'ogg', '3gp', 'flac'].contains(file.extension)) {
      classes.push('audio');
    } else if (['mp4', 'webm', 'ogv'].contains(file.extension)) {
      classes.push('video');
    } else if (file.extension === 'pdf') {
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
          const tags = parseFrontMatterTags(cache.frontmatter);
          if (tags) {
            classes.push(..._parseTags(tags));
          }
        }
        if ('cssclass' in cache.frontmatter) {
          const clazzes = parseFrontMatterStringArray(cache.frontmatter, 'cssclass');
          if (clazzes) {
            classes.push(...clazzes);
          }
        }
      }
      if (cache?.tags) {
        classes.push(..._parseTags(cache.tags.map((t:TagCache) => t.tag)));
      }
    } else {
      classes.push('file');
    }
    return classes;
  }
  return [CAT_DANGLING];
};

export const nodeFromFile = async function(file: TFile, plugin: Plugin) : Promise<NodeDefinition> {
  const cache = plugin.app.metadataCache.getFileCache(file);
  const name = file.extension === 'md' ? file.basename : file.name;
  const classes = getClasses(file, plugin.app.metadataCache).join(' ');
  const data = {
    id: VizId.toId(file.name, CORE_STORE_ID),
    name: name,
    path: file.path,
  } as NodeDataDefinition;
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'tiff'].contains(file.extension)) {
    try {
      // @ts-ignore
      data['resource_url'] = `http://localhost:${plugin.settings.imgServerPort}/${encodeURI(file.path)}`;
    } catch {}
  }
  if (file.extension == 'md') {
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
          } catch {
            try {
              // @ts-ignore
              data[k] = `http://localhost:${plugin.settings.imgServerPort}/${encodeURI(imageField)}`;
            } catch {}
          }
        } else {
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

export const nodeDangling = function(path: string): NodeDefinition {
  return {
    group: 'nodes',
    data: {
      id: VizId.toId(path, CORE_STORE_ID),
      name: path,
    },
    classes: 'dangling',
  };
};

export const wikilinkRegex = '\\[\\[([^\\]\\r\\n]+?)\\]\\]';
export const nameRegex = '[^\\W\\d]\\w*';

const regexEscape = function(str: string) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const parseTypedLink = function(link: ReferenceCache, line: string, typedLinkPrefix: string): ITypedLink {
  // TODO: This is something specific I use, but shouldn't keep being in this repo.
  const regexPublishedIn = new RegExp(
      `^${regexEscape(typedLinkPrefix)} (publishedIn) (\\d\\d\\d\\d) (${wikilinkRegex},? *)+$`);
  const matchPI = regexPublishedIn.exec(line);
  if (!(matchPI === null)) {
    return {
      class: 'type-publishedIn',
      isInline: false,
      properties: {
        year: matchPI[2],
        context: '',
        type: 'publishedIn',
      } as ITypedLinkProperties,
    } as ITypedLink;
  }

  // Intuition: Start with the typed link prefix. Then a neo4j name (nameRegex).
  // Then one or more of the wikilink group: wikilink regex separated by optional comma and multiple spaces
  const regex = new RegExp(
      `^${regexEscape(typedLinkPrefix)} (${nameRegex}) (${wikilinkRegex},? *)+$`);
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
      } as ITypedLinkProperties,
    } as ITypedLink;
  }
  return null;
};

export const parseRefCache = function(ref: ReferenceCache, content: string[], id: string, source: string, target: string, typedLinkPrefix: string): EdgeDefinition {
  const line = content[ref.position.start.line];
  let data = {
    id: id,
    source: source,
    target: target,
    context: line,
    edgeCount: 1,
  } as EdgeDataDefinition;
  const splitLink = ref.original.split('|');
  if (splitLink.length > 1) {
    data['alias'] = splitLink.slice(1).join().slice(0, -2);
  }
  let classes = '';
  const typedLink = parseTypedLink(ref, line, typedLinkPrefix);
  if (typedLink === null) {
    classes = `${classes} inline`;
  } else {
    data = {...typedLink.properties, ...data};
    classes = `${classes} ${typedLink.class}`;
  }
  return {
    group: 'edges',
    data: data,
    classes: classes,
  } as EdgeDefinition;
};
