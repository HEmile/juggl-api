import type {NodeCollection, NodeSingular} from 'cytoscape';
import type {TagCache, TFile} from 'obsidian';
import {parseFrontMatterStringArray, parseFrontMatterTags} from 'obsidian';

const CAT_DANGLING = 'dangling';

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
      const name = file.extension === 'md' ? file.basename : file.name;
      return new VizId(name, 'core');
    }

    static fromPath(path: string): VizId {
      const pth = require('path');
      const name = pth.basename(path, '.md');
      return new VizId(name, 'core');
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

export const getClasses = function(file: TFile): string[] {
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
      const cache = this.app.metadataCache.getFileCache(file);
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
