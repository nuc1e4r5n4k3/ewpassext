import 'regenerator-runtime';
import { getPasswordHash, sendKeepAlive, storePasswordHash } from '../internalapi/requests';

let receivedResponse = true;
let isReviving = false;
let passwordHash: string|null|undefined = undefined;

getPasswordHash().then(response => {
    if (response.passwordHash)
        passwordHash = response.passwordHash;
    else
        window.close();
});

const sendKeepAliveOrCloseWindow = async () => {
    if (receivedResponse) {
        receivedResponse = false;
        const isCached = (await sendKeepAlive('keepAliveTab')).cacheState;
        if (!isCached) {
            const currentlyCached = (await getPasswordHash()).passwordHash;
            if (currentlyCached === null)
                window.close();
            else if (currentlyCached === undefined)
                receivedResponse = false;
            else
                receivedResponse = true;
        }
        else 
            receivedResponse = true;
    } else if (!isReviving) {
        isReviving = true;
        await storePasswordHash(passwordHash || undefined);
        receivedResponse = true;
        isReviving = false;
    } else {
        window.close();
    }
};

/*
 *  Only cache for max 5 minutes
 *  FIXME: Need to find a way to synchronize this with server worker and popup
 */
setTimeout(() => window.close(), 300*1000);

setInterval(sendKeepAliveOrCloseWindow, 2000);
sendKeepAliveOrCloseWindow();
