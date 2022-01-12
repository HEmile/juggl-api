import type {Component, ReferenceCache} from 'obsidian';
import type {EdgeDefinition, LayoutOptions, NodeCollection, NodeDefinition} from 'cytoscape';
import type {Menu} from 'obsidian';
import type {NodeSingular} from 'cytoscape';
import type {TFile} from 'obsidian';
import type {Collection} from 'cytoscape';
import {
  EventRef,
  Events, MetadataCache,
  Vault,
  Workspace,
  Plugin, App,
} from 'obsidian';
import type {
  Core,
  ElementDefinition, Layouts,
} from 'cytoscape';
import Timeout = NodeJS.Timeout;

export function getClasses(file: TFile, metadataCache: MetadataCache): string[];

export function nodeFromFile(file: TFile, plugin: Plugin): Promise<NodeDefinition>;

export function nodeDangling(path: string): NodeDefinition;

export function parseRefCache(ref: ReferenceCache, content: string[], id: string, source: string, target: string, typedLinkPrefix: string): EdgeDefinition;

export function parseTypedLink(link: ReferenceCache, line: string, typedLinkPrefix: string): ITypedLink;

export function getPlugin(app: App): IJugglPlugin | null;

export interface LayoutSettings {

    startLayout(view: IJuggl): Layouts;

    options: LayoutOptions;

}

export interface ITypedLinkProperties {
    context: string;
    type: string;
    alias?: string;
    [key: string]: any;
}

export interface ITypedLink {
    properties: ITypedLinkProperties;
    isInline: boolean;
    class: string;
}

export class DataStoreEvents extends Events {
  public on(name: 'renameNode', callback: (oldName: string, newName: string) => any, ctx?: any): EventRef;
  public on(name: 'deleteNode', callback: (name: string) => any, ctx?: any): EventRef;
  public on(name: 'modifyNode', callback: (name: string) => any, ctx?: any): EventRef;
  public on(name: 'createNode', callback: (name: string) => any, ctx?: any): EventRef;
}

export interface IDataStore extends Component {

    getEvents(): DataStoreEvents;


    getNeighbourhood(nodeId: VizId[]): Promise<NodeDefinition[]>;

    connectNodes(allNodes: NodeCollection, newNodes: NodeCollection, graph: IJuggl): Promise<EdgeDefinition[]>;

    refreshNode(view: IJuggl, id: VizId): void | Promise<void>;

    // Prefix of id of nodes from this store
    storeId(): string;

}

export interface ICoreDataStore extends IDataStore {

    get(nodeId: VizId): Promise<NodeDefinition>;
}


export interface IJugglStores {
    coreStore: ICoreDataStore;
    dataStores: IDataStore[];
}

export interface IAGMode extends Component {
    getName(): string;

    fillMenu(menu: Menu, nodes: NodeCollection): void;

    createToolbar(element: Element): void;

}

export class VizId {
    id: string;
    storeId: string;

    constructor(id: string, storeId: string) ;

    toString(): string ;

    toId(): string;

    static fromId(id: string): VizId;

    static fromNode(node: NodeSingular): VizId;

    static fromNodes(nodes: NodeCollection): VizId[];

    static fromFile(file: TFile): VizId;

    static fromPath(path: string): VizId;

    static toId(id: string, storeId: string): string;
}


export interface IMergedToGraph {
    merged: Collection;
    added: Collection;
}

export const MD_VIEW_TYPE = 'markdown';

export interface IJugglPlugin extends Plugin{
    path: string;
    vault: Vault;
    metadata: MetadataCache
    coreStores: Record<string, ICoreDataStore> ;
    stores: IDataStore[] ;

    openFileFromNode(node: NodeSingular, newLeaf?: boolean): Promise<TFile>;

    openLocalGraph(name: string): void;

    openGlobalGraph(): void;

    activeGraphs(): IJuggl[];

    registerStore(store: IDataStore): void;

    registerCoreStore(store: ICoreDataStore, name: string): void;

    createJuggl(el: HTMLElement, settings?: IJugglSettings, datastores?: IJugglStores, initialiNodes?: string[]): IJuggl;
}

export type FDGDLayouts = 'cola'| 'd3-force';
export type JugglLayouts = 'force-directed' | 'circle' | 'grid' | 'hierarchy' | FDGDLayouts;
export type CytoscapeLayouts = FDGDLayouts | 'concentric' | 'grid' | 'dagre';
export type JugglMode = 'local' | 'workspace';
export type AllLayouts = CytoscapeLayouts | JugglLayouts;

export type Shape = 'ellipse'|
    'rectangle'|
    'triangle'|
    'diamond'|
    'pentagon'|
    'hexagon'|
    'tag'|
    'rhomboid'|
    'star'|
    'vee'|
    'round-rectangle'|
    'round-triangle'|
    'round-diamond'|
    'round-pentagon'|
    'round-hexagon'|
    'round-tag'

export class Icon {
    path: string;
    name: string;
    color: string;
}

export interface StyleGroup {
    filter: string;
    color: string;
    shape: Shape;
    icon: Icon;
    showInPane: boolean;
    show: boolean;
    size: number;
}

export interface IJugglSettings {
    autoAddNodes: boolean;
    autoExpand: boolean;
    autoZoom: boolean;
    coreStore: string;
    expandInitial: boolean;
    fdgdLayout: FDGDLayouts ;
    filter: string;
    height: string | number;
    hoverEdges: boolean;
    layout: JugglLayouts | LayoutOptions;
    limit: number;
    mergeEdges: boolean;
    metaKeyHover: boolean;
    mode: JugglMode;
    navigator: boolean;
    openWithShift: boolean;
    styleGroups: StyleGroup[];
    toolbar: boolean;
    width: string | number;
    zoomSpeed: number;
}

/*
defaultSheet comes before graph.css, yamlModifySheet comes after.
 */
export class GraphStyleSheet {
    defaultSheet: string;
    yamlModifySheet: string;
    plugin: IJugglPlugin;

    getStylesheet(viz: IJuggl): Promise<string> ;

    styleGroupsToSheet(groups: StyleGroup[], groupPrefix: string): string;

    getDefaultStylesheet(): string;
}

export interface IJuggl extends Component {
    element: Element;
    workspace: Workspace;
    settings: IJugglSettings;
    initialNodes: string[];
    vault: Vault;
    plugin: IJugglPlugin;
    viz: Core;
    selectName: string;
    events: Events;
    datastores: IJugglStores;
    activeLayout: Layouts;
    hoverTimeout: Record<string, Timeout>;
    mode: IAGMode;
    vizReady: boolean;

    neighbourhood(toExpand: VizId[]) : Promise<NodeDefinition[]>;

    buildEdges(newNodes: NodeCollection): Promise<EdgeDefinition[]>;

    expand(toExpand: NodeCollection, batch?: boolean, triggerGraphChanged?: boolean): Promise<IMergedToGraph>;

    updateStylesheet(): Promise<void>;

    removeNodes(nodes: NodeCollection): NodeCollection;

    fitView(nodes?: NodeCollection): void;

    restartLayout(): void;

    setLayout(settings: LayoutSettings): void;

    mergeToGraph(elements: ElementDefinition[], batch?: boolean, triggerGraphChanged?: boolean): IMergedToGraph;

    assignStyleGroups(): void;

    onGraphChanged(batch?:boolean, debounceLayout?: boolean): void;

    setMode(modeName: string): void;

    searchFilter(query: string): void;

    getPinned(): NodeCollection;

    getExpanded(): NodeCollection;

    getProtected(): NodeCollection;

    on(name:'stylesheet', callback: (sheet: GraphStyleSheet) => any): EventRef;
    on(name: 'expand', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'hide', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'pin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'unpin', callback: (elements: NodeCollection) => any): EventRef;
    on(name: 'selectChange', callback: () => any): EventRef;
    on(name: 'elementsChange', callback: () => any): EventRef;
    on(name: 'vizReady', callback: (viz: Core) => any): EventRef;
    on(name: string, callback: (...data: any) => any, ctx?: any): EventRef;
    off(name: string, callback: (...data: any) => any): void;
    offref(ref: EventRef): void;
    trigger(name: string, ...data: any[]): void;
    tryTrigger(evt: EventRef, args: any[]): void;
}
