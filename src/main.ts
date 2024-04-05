/// <reference types="@workadventure/iframe-api-typings" />

import {bootstrapExtra} from "@workadventure/scripting-api-extra";
// MapLogic.ts
import {Layer, TiledMap, TiledObject} from './interfaces/TiledMap';
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/"

console.log('Script started successfully');

let currentPopup: any = undefined;

async function fetchDataFromAPI(apiEndpoint: RequestInfo | URL) {
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
        throw new Error('Échec de l’appel API');
    }
    return await response.json();
}

// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Scripting API ready');
    console.log('Player tags: ', WA.player.tags)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    const chambers = await getChambersWithId();

    // Initialize onEnter function for each chamber in the hotel.
    for (const chamber of chambers) {
        WA.room.area.onEnter(chamber.name).subscribe(async () => {
            try {
                const data = await fetchChamberData(chamber.chamberId);
                console.log(data.description);
                currentPopup = WA.ui.openPopup("chamberDetailPopup", data.description, []);
            } catch (error) {
                console.error("Error fetching chamber details");
            }
        });
    }

    /* Open the modal for each chamber in the hotel.
    for (const chamber of chambers)
    {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            WA.ui.modal.openModal({
                allow: null, allowApi: true, position: "right", title: "",
                src: 'https://workadventu.re'

            });
        });
    }
     */

    for (const chamber of chambers) {
        WA.room.area.onLeave(chamber.name).subscribe(closePopup);
    }

    //Spa zones
    WA.room.area.onEnter('spa_counter').subscribe(() => {
        WA.ui.modal.openModal({
            allow: null, allowApi: true, position: "right", title: "Book your activity",
            src: 'https://workadventu.re/?id='
        });
    })
    WA.room.area.onLeave('spa_counter').subscribe(() => {
        WA.ui.modal.closeModal()
    })

    WA.room.area.onEnter('pool_reservation').subscribe(async () => {
        try {
            closePopup()
            const apiResult = await fetchDataFromAPI(`${API_BASE_URL}temperature/current`);
            const temperature = apiResult.temperature;
            currentPopup = WA.ui.openPopup("pool_reservation_popup", "Température actuelle : " + temperature, []);
        } catch (error) {
            console.error('Erreur lors de l’appel à l’API:', error);
            currentPopup = WA.ui.openPopup("pool_reservation_popup", "Impossible de récupérer les données.", []);
        }
    })
    WA.room.area.onLeave('pool_reservation').subscribe(closePopup)

    WA.room.area.onEnter('swimming_pool').subscribe(() => {
        closePopup();
        currentPopup = WA.ui.openPopup("swimming_pool_popup", "Plouf plouf", []);
    })
    WA.room.area.onLeave('swimming_pool').subscribe(closePopup)

    WA.room.area.onEnter('hammam_reservation').subscribe(async () => {
        closePopup()
        currentPopup = WA.ui.openPopup("hammam_reservation_popup", "Température actuelle : 62°C", []);
    })
    WA.room.area.onLeave('hammam_reservation').subscribe(closePopup)

    WA.room.area.onEnter('hammam').subscribe(async () => {
        closePopup()
        currentPopup = WA.ui.openPopup("hammam_popup", "Il fait chaud ici...", []);
    })
    WA.room.area.onLeave('hammam').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup() {
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
        obj.properties?.some(prop => prop.name === "chamberId")
    );
}

//  Return an array with the chamber name and the chamberId for each chamber.
async function getChambersWithId(): Promise<{ name: string; chamberId: number }[]> {
    const hotelMap: TiledMap = await WA.room.getTiledMap();
    const chambersWithId = filterChambersWithIdFromTiledLayer(hotelMap.layers)

    return chambersWithId.map(chamber => {
        const chamberIdProp = chamber.properties?.find(prop => prop.name === "chamberId");
        return {
            name: chamber.name,
            chamberId: chamberIdProp ? chamberIdProp.value : null,
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
