/*
 * @license
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
import { html, render } from 'https://unpkg.com/lit-html@1.0.0/lit-html.js?module';

const rp_hostname = 'spc-rp.glitch.me';
const rp_origin = `https://${rp_hostname}`;

export const generateRandomCardNumber = () => {
    let number = localStorage.getItem('card_number');
    if (!number) {
        number = (Math.floor(Math.random()*(10**12))).toString().padStart(12, '0');
    }
    return number;
}

const snackbar = document.querySelector('#snackbar');

export function showSnackbar(message) {
    snackbar.labelText = message;
    snackbar.show();
};

export const _fetch = async (path, payload = '') => {
    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
    };
    if (payload && !(payload instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(payload);
    }
    const res = await fetch(path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers,
        body: payload,
    });
    if (res.status === 200) {
        // Server authentication succeeded
        return res.json();
    } else if (res.status === 404) {
        return null;
    } else {
        // Server authentication failed
        const result = await res.json();
        throw new Error(result.error);
    }
};

const isSecurePaymentConfirmationSupported = async () => {
    if (!'PaymentRequest' in window) {
        return [false, 'Payment Request API is not supported'];
    }

    try {
        // The data below is the minimum required to create the request and
        // check if a payment can be made.
        const supportedInstruments = [
            {
                supportedMethods: "secure-payment-confirmation",
                data: {
                    rpId: rp_hostname,
                    credentialIds: [new Uint8Array(1)],
                    challenge: new Uint8Array(1),
                    instrument: {
                        // Non-empty display name string
                        displayName: ' ',
                        // Transparent-black pixel.
                        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
                    },
                    // A dummy origin
                    payeeOrigin: 'https://non-existent.example',
                }
            }
        ];

        const details = {
            // Dummy shopping details
            total: {label: 'Total', amount: {currency: 'USD', value: '0'}},
        };

        const request = new PaymentRequest(supportedInstruments, details);
        const canMakePayment = await request.canMakePayment();
        return [canMakePayment, canMakePayment ? '' : 'SPC is not available'];
    } catch (error) {
        console.error(error);
        return [false, error.message];
    }
};


export const pay = async (price, number) => {
    // Feature detection
    const [spcAvailable, error] = await isSecurePaymentConfirmationSupported();
    if (spcAvailable) {
        // Check whether any credentials are available.
        const url = new URL(`${rp_origin}/auth/apiRequest`);
        const requestOptions = await _fetch(url, { number });
        // Null means the endpoint returned 404.
        // `allowCredentials` with empty array means there's no credentials stored on the server.
        if (requestOptions && requestOptions.allowCredentials.length > 0) {
            await payWithSPC(requestOptions, price, number);
            return true;
        }
    } else {
        return false;
    }
};

const payWithSPC = async (requestOptions, price, number) => {
    const { challenge, timeout } = requestOptions;
    const credentialIds = requestOptions.allowCredentials.map(cred => base64url.decode(cred.id));

    const request = new PaymentRequest([{
            // Specify `secure-payment-confirmation` as payment method.
            supportedMethods: "secure-payment-confirmation",
            data: {
                // The RP ID
                rpId: rp_hostname,

                // List of credential IDs obtained from the RP.
                credentialIds,

                // The challenge is also obtained from the RP.
                challenge: base64url.decode(challenge),

                // A display name and an icon that represent the payment instrument.
                instrument: {
                    displayName: `${formatLastFour(number)}`,
                    icon: "https://cdn.glitch.global/94838ffe-241b-4a67-a9e0-290bfe34c351/fancybank_card.png?v=1717768798028",
                    iconMustBeShown: false
                },

                // The origin of the payee
                payeeOrigin: "https://spc-merchant.glitch.me",

                // The name of the payee
                payeeName: "SPC Shop",

                // The number of milliseconds to timeout.
                timeout,

                // Experimental parameters (crbug.com/333945861)
                issuerInfo: {
                    name: 'Fancy Bank',
                    icon: "https://cdn.glitch.me/94838ffe-241b-4a67-a9e0-290bfe34c351%2Fbank.png?v=1639111444422",
                },
            }}],
        // Payment details.
        {
            total: {
                label: "Total",
                amount: {
                    currency: "USD",
                    value: price,
                },
            },
        });

    let response;
    try {
        response = await request.show();

        // response.details is a PublicKeyCredential, with a clientDataJSON that
        // contains the transaction data for verification by the issuing bank.
        const cred = response.details;
        const credential = {};
        credential.id = cred.id;
        credential.type = cred.type;
        credential.rawId = base64url.encode(cred.rawId);

        if (cred.response) {
            const clientDataJSON =
                base64url.encode(cred.response.clientDataJSON);
            const authenticatorData =
                base64url.encode(cred.response.authenticatorData);
            const signature =
                base64url.encode(cred.response.signature);
            const userHandle =
                base64url.encode(cred.response.userHandle);
            credential.response = {
                clientDataJSON,
                authenticatorData,
                signature,
                userHandle,
            };
        }

        const url = new URL(`${rp_origin}/auth/apiResponse`);
        url.searchParams.append('number', number);
        await _fetch(url.toString(), credential);
        await response.complete('success');

        /* send response.details to the issuing bank for verification */
    } catch (err) {
        await response.complete('fail');
        /* SPC cannot be used; merchant should fallback to traditional flows */
        console.error(err.message);
        throw err;
    }
};

const formatLastFour = (cardNumber) => {
    return `**** ${cardNumber.slice(-4)}`
};
