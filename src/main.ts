/// <reference types="@workadventure/iframe-api-typings" />

import {bootstrapExtra} from "@workadventure/scripting-api-extra";
// MapLogic.ts

import { TiledMap } from './interfaces/TiledMap';

console.log('Script started successfully');

let currentPopup: any = undefined;

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

    // Initialize onEnter function for each chamber in the hotel?.
    for (const chamber of chambers) {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            console.log(chamber.chamberId);
        });
    }

    // Open the modal for each chamber in the hotel.
    for (const chamber of chambers)
    {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            WA.ui.modal.openModal({
                allow: null, allowApi: false, position: "right", title: "",
                src: 'https://workadventu.re'

            });
        });
    }

    WA.room.area.onLeave("log").subscribe(closeModal);
    WA.room.area.onLeave("log").subscribe(closePopup);

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

function closeModal() {
    WA.ui.modal.closeModal();
}

// Get all chambers with an chamberId custom prop, to use it to fetch details in the booking api.
async function getChambersWithId(): Promise<{ name: string; chamberId: any }[]> {
    const hotelMap: TiledMap = await WA.room.getTiledMap();

    const chambersWithId = hotelMap.layers
        .find(layer => layer.name === "floorLayer")
        ?.objects
        ?.filter(obj => obj.properties?.some(prop => prop.name === "chamberId")) || [];

    return chambersWithId.map(chamber => {
        const chamberIdProp = chamber.properties?.find(prop => prop.name === "chamberId");
        return {
            name: chamber.name,
            chamberId: chamberIdProp ? chamberIdProp.value : null,
        };
    });
}
export {};
