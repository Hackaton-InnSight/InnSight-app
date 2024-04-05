/// <reference types="@workadventure/iframe-api-typings" />

import {bootstrapExtra} from "@workadventure/scripting-api-extra";
// MapLogic.ts

import { TiledMap, TiledObject, Layer } from './interfaces/TiledMap';
import axios from "axios";
import {ActionMessage} from "@workadventure/iframe-api-typings";
// import {RemotePlayerInterface} from "@workadventure/iframe-api-typings";

const API_BASE_URL = "http://localhost:8080/"

console.log('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Scripting API ready');
    console.log('Player tags: ', WA.player.tags)
    console.log(WA.state)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    WA.room.area.onEnter('car_red').subscribe(() => {
        const mySound = WA.sound.loadSound("./sounds/son_ferrari.ogg");
        const config = {
            volume : 1,
            loop : false,
            rate : 1,
            detune : 1,
            delay : 0,
            seek : 0,
            mute : false
        }
        mySound.play(config);

        currentPopup = WA.ui.openPopup("carPopup", "VROOOM VROOOM", []);
    });
    WA.room.area.onLeave('carPopup').subscribe(closePopup);


    WA.state.onVariableChange('doorState').subscribe((doorState) => {
        displayDoor(doorState as boolean);
    });

    let openCloseMessage: ActionMessage | undefined;
    WA.room.area.onEnter('inside_door').subscribe(() => {
        openCloseMessage = WA.ui.displayActionMessage({
            message: "Press 'space' to open/close the door",
            callback: () => {
                WA.state.doorState = !WA.state.doorState;
            }
        });
    });
    WA.room.area.onLeave('doorState').subscribe(() => {
        if (openCloseMessage !== undefined) {
            openCloseMessage.remove();
        }
    });


     WA.room.area.onEnter('elevator_zone').subscribe(() => {
         WA.ui.website.open({
             url: "https://hackaton-innsight.github.io/select_elevator/",
             position: {
                 vertical: "top",
                 horizontal: "middle",
             },
             size: {
                 height: "30vh",
                 width: "auto",
             },
             allowApi: true
         })
     });


    WA.room.area.onEnter('elevator_wait_zone').subscribe(() => {
        const mySound = WA.sound.loadSound("./sounds/son_elevator.ogg");
        const config = {
            volume : 1,
            loop : true,
            rate : 1,
            detune : 1,
            delay : 0,
            seek : 0,
            mute : false
        }
        mySound.play(config);
    });

    const chambers = await getChambersWithId();

    // Initialize onEnter function for each chamber in the hotel.
    for (const chamber of chambers) {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            console.log(chamber.chamberId);
            console.log("DEBUG API: ", API_BASE_URL + `rooms/${chamber.chamberId}`);
            fetchChamberData(105);
        });
    }

    // Open the modal for each chamber in the hotel.
    for (const chamber of chambers)
    {
        WA.room.area.onEnter(chamber.name).subscribe(() => {
            WA.ui.modal.openModal({
                allow: null, allowApi: true, position: "right", title: "",
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


/**
 * Utility function to display the correct door image depending on the state of the door.
 */
function displayDoor(state: boolean) {
    if (state) {
        WA.room.showLayer('Fixtures/door_closed');
        WA.room.hideLayer('Aboves/door_opened');
    } else {
        WA.room.hideLayer('Fixtures/door_closed');
        WA.room.showLayer('Aboves/door_opened');
    }
}


function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

function closeModal() {
    WA.ui.modal.closeModal();
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
        console.log(response.data.description);
    } catch (error) {
        console.error(error);
    }
}
export {};
