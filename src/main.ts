/// <reference types="@workadventure/iframe-api-typings" />

import {bootstrapExtra} from "@workadventure/scripting-api-extra";
// MapLogic.ts
import {Layer, TiledMap, TiledObject} from './interfaces/TiledMap';
import axios from "axios";
import {ActionMessage} from "@workadventure/iframe-api-typings";
// import {RemotePlayerInterface} from "@workadventure/iframe-api-typings";

const API_BASE_URL = "http://localhost:8080/"

console.log('Script started successfully');

let currentPopup: any = undefined;
let currentWebsite: any = undefined;

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


    // for rooms
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((roomNumber) => {
        const displayDoor = (state: boolean, room: number) => {
            if (state) {
                WA.room.showLayer(`doors/room_${room}/door_closed`);
                WA.room.hideLayer(`doors/room_${room}/door_opened`);
            } else {
                WA.room.hideLayer(`doors/room_${room}/door_closed`);
                WA.room.showLayer(`doors/room_${room}/door_opened`);
            }
        };
        //
        WA.state.onVariableChange(`door_state_${roomNumber}`).subscribe((doorState) => {
            displayDoor(doorState as boolean, roomNumber);
        });
        //
        let openCloseMessage: ActionMessage | undefined;
        WA.room.area.onEnter(`door_inside_${roomNumber}`).subscribe(() => {
            openCloseMessage = WA.ui.displayActionMessage({
                message: "Press 'space' to open/close the door",
                callback: () => {
                    WA.state[`door_state_${roomNumber}`] = !WA.state[`door_state_${roomNumber}`];
                }
            });
        });
        WA.room.area.onLeave(`door_inside_${roomNumber}`).subscribe(() => {
            if (openCloseMessage !== undefined) {
                openCloseMessage.remove();
            }
        });

    });


    // Restaurant door
    WA.state.onVariableChange('doorState').subscribe((doorState) => {
        displayDoorRestaurant(doorState as boolean);
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
            loop : false,
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
        WA.room.area.onEnter(chamber.name).subscribe(async () => {
            try {
                const data = await fetchChamberData(chamber.chamberId);
                currentPopup = WA.ui.openPopup(`${chamber.name}_details`, data.description, []);
                WA.ui.modal.openModal({
                    allow: null,
                    allowApi: false,
                    position: "right",
                    title: "Booking",
                    src: 'https://workadventu.re'
                });

                currentWebsite = await WA.ui.website.open({
                    url: "https://hackaton-innsight.github.io/room-availabality/?roomId=5&isAvailable=true",
                    position: {
                        vertical: "middle",
                        horizontal: "middle",
                    },
                    size: {
                        height: "13vh",
                        width: "37vw",
                    },
                })
            } catch (error) {
                console.error("Error fetching chamber details");
            }
        });
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

    // Closing popup and modal when leaving a room.
    for (const chamber of chambers) {
        WA.room.area.onLeave(chamber.name).subscribe(closePopup);
        WA.room.area.onLeave(chamber.name).subscribe(closeModal);
        WA.room.area.onLeave(chamber.name).subscribe(closeWebsite);
    }

    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));


/**
 * Utility function to display the correct door image depending on the state of the door.
 */
function displayDoorRestaurant(state: boolean) {
    if (state) {
        WA.room.showLayer('Fixtures/door_closed');
        WA.room.hideLayer('Aboves/door_opened');
    } else {
        WA.room.hideLayer('Fixtures/door_closed');
        WA.room.showLayer('Aboves/door_opened');
    }
}


function closePopup() {
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

function closeWebsite() {
    if (currentWebsite !== undefined) {
        currentWebsite.close();
        currentWebsite = undefined;
    }
}

function closeModal(){
    WA.ui.modal.closeModal()
}

// Get all chambers with an chamberId custom prop.
function filterChambersWithIdFromTiledLayer(layers: Layer[]): TiledObject[] {
    const floorLayer = layers.find(layer => layer.name === "floorLayer");
    if (!floorLayer || !floorLayer.objects) return [];

    return floorLayer.objects.filter(obj =>
        obj.properties?.some(prop => prop.name === "roomId")
    );
}

// Return an array with the chamber name and the chamberId for each chamber.
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
