/// <reference types="@workadventure/iframe-api-typings" />

import {bootstrapExtra} from "@workadventure/scripting-api-extra";
// MapLogic.ts

import { TiledMap, TiledObject, Layer } from './interfaces/TiledMap';
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/"

console.log('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Scripting API ready');
    console.log('Player tags: ', WA.player.tags)

    const chambers = await getChambersWithId();

    // Initialize onEnter function for each chamber in the hotel.
    for (const chamber of chambers) {
        WA.room.area.onEnter(chamber.name).subscribe(async () => {
            try {
                console.log(chamber.name)
                console.log(chamber.chamberId)
                //const data = await fetchChamberData(chamber.chamberId);
                //console.log(data.description);
                //currentPopup = WA.ui.openPopup("chamberDetailPopup", data.description, []);
                currentPopup = WA.ui.openPopup(`${chamber.name}_details`, chamber.name, []);
            } catch (error) {
                console.error("Error fetching chamber details");
            }
        });
    }

    /*
    //Open the modal for each chamber in the hotel.
    for (const chamber of chambers)
    {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            WA.ui.modal.openModal({
                allow: null, allowApi: false, position: "right", title: "",
                src: 'https://workadventu.re'

            });
        });
    }
    */

    for (const chamber of chambers) {
        WA.room.area.onLeave(chamber.name).subscribe(closePopup);
    }

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

// Get all chambers with an chamberId custom prop.
function filterChambersWithIdFromTiledLayer(layers: Layer[]): TiledObject[] {
    const floorLayer = layers.find(layer => layer.name === "floorLayer");
    if (!floorLayer || !floorLayer.objects) return [];

    return floorLayer.objects.filter(obj =>
        obj.properties?.some(prop => prop.name === "roomId")
    );
}

//  Return an array with the chamber name and the chamberId for each chamber.
async function getChambersWithId(): Promise<{ name: string; chamberId: number }[]> {
    const hotelMap: TiledMap = await WA.room.getTiledMap();
    const chambersWithId = filterChambersWithIdFromTiledLayer(hotelMap.layers)

    return chambersWithId.map(chamber => {
        const roomIdProp = chamber.properties?.find(prop => prop.name === "roomId");
        return {
            name: chamber.name,
            chamberId: roomIdProp ? roomIdProp.value : null,
        };
    });
}

// Get details from reservation api for a chamber identified by his chamberId
async function fetchChamberData(chamberId: number) {
    try {
        const response = await axios.get(`${API_BASE_URL}rooms/${chamberId}`);
        return response.data;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch data");
    }
}

export {};
