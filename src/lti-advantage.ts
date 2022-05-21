import axios, {AxiosResponse} from 'axios';
import {Agent} from 'https';
import jwt from 'jsonwebtoken';
import { jwk2pem } from 'pem-jwk';
import { URL } from 'url';
import Config from './config';
import { JWTPayload } from './jwt-payload';

export interface IODICOptions {
    loginHint: string;
    ltiMessageHint: string;
    state: string;
    nonce: string;
    redirectUri: string;
}

export const getRedirectUrl = (learnUrl: string, authDoneUrl: string ): string => {
    const redirectUrl: string = authDoneUrl + '?learn_url=' + learnUrl;
    return redirectUrl;
};

export const getUserAccessToken = async (learnUrl: string, accessCode: string ): Promise<any> => {
    const authToken: string = Buffer.from(`${Config.appKey}:${Config.secret}`).toString('base64');

    const agent = new Agent({
        rejectUnauthorized: false,
    });

    const url = new URL('learn/api/public/v1/oauth2/token', learnUrl);
    url.searchParams.append('grant_type', 'authorization_code');
    url.searchParams.append('code', accessCode);
    url.searchParams.append('redirect_uri', getRedirectUrl(learnUrl, Config.webAppHost + '/auth-done'));
    const authResponse: AxiosResponse = await axios.post(url.href,
        {},
        {
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            httpsAgent: agent,
        });
    return authResponse.data;
};

export const getOauth2AuthorizationUrl = (learnUrl: string, state: string): string  => {
    const redirectUrl = getRedirectUrl(learnUrl, Config.webAppHost + '/auth-done');
    const authCodeUrl = learnUrl + '/learn/api/public/v1/oauth2/authorizationcode'
    + '?response_type=code&client_id=' + Config.appKey
    + '&redirect_uri=' + encodeURIComponent(redirectUrl)
    + '&state=' + encodeURIComponent(state);
    return authCodeUrl;
};

export const getJWTPayload = async (idToken: string): Promise<JWTPayload | null> => {
    const appKey = Config.appKey;
    const clientId = Config.clientId;
    const jwtPayload = new JWTPayload(idToken);

    if (clientId !== jwtPayload.clientId) {
        console.log('Client ID passed in does not match configured client ID');
        return null;
    }

    const jwksUrl = new URL(`/api/v1/management/applications/${clientId}/jwks.json`, Config.devPortalHost);

    try {
        const response = await axios.get(jwksUrl.href);
        const key = response.data.keys.find((k: any) => k.kid === jwtPayload.kid);

        jwt.verify(idToken, jwk2pem(key));
        jwtPayload.verified = true;
    } catch (err) {
        console.log(`Get public keys failed: ${JSON.stringify(err)}`);
    }

    return jwtPayload;
};

export function getLearnUrlFromJwtPayload(jwtPayload: JWTPayload): string {
    const url: URL = new URL(jwtPayload.returnUrl);
    return `${url.protocol}//${url.host}`;
}

const oidcUrl = (options: IODICOptions): string => {
    const appKey = Config.appKey;
    const clientId = Config.clientId;
    const oidcAuthUrl = new URL('/api/v1/gateway/oidcauth', Config.devPortalHost);
    // const oidcAuthUrl = new URL(Config.webAppHost + '/launches/lti');
    oidcAuthUrl.searchParams.append('response_type', 'id_token');
    oidcAuthUrl.searchParams.append('scope', 'openid');
    oidcAuthUrl.searchParams.append('state', options.state);
    oidcAuthUrl.searchParams.append('redirect_uri', options.redirectUri);
    oidcAuthUrl.searchParams.append('client_id', clientId);
    oidcAuthUrl.searchParams.append('nonce', options.nonce);
    oidcAuthUrl.searchParams.append('login_hint', options.loginHint);
    oidcAuthUrl.searchParams.append('lti_message_hint', options.ltiMessageHint);

    return oidcAuthUrl.href;
};

export {
    oidcUrl,
};
