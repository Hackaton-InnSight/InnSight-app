export interface TiledMap {
    layers: Layer[];
}

export interface Layer {
    name: string;
    objects?: TiledObject[];
}

export interface TiledObject {
    name: string;
    properties?: Property[];
}

export interface Property {
    name: string;
    value: any;
}
