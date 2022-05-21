import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import https from 'https';
import { v4 as uuid } from 'uuid';
const assetsDir = __dirname + '/../src/assets';
const version = process.env.WEB_APP_VERSION || 'dev';
import Config from './config';
import {
    getJWTPayload,
    getLearnUrlFromJwtPayload, getOauth2AuthorizationUrl, getUserAccessToken,
    IODICOptions,
    oidcUrl,
} from './lti-advantage';

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.json({ type: 'application/json' }));
app.use(cors());
app.use('/assets', express.static(assetsDir));
app.set('view engine', 'ejs');
app.set('views', assetsDir);

app.get('/', (req, res) => {
    res.send(`Demo UEF Tool version ${version} is running...`);
});

app.get('/login', (req, res) => {
    const state = uuid();
    const nonce = uuid();

    const redirectUri = new URL('/launches', Config.webAppHost).href;

    const odicOptions: IODICOptions = {
        loginHint: decodeURIComponent(req.query.login_hint) || '',
        ltiMessageHint: decodeURIComponent(req.query.lti_message_hint) || '',
        nonce,
        redirectUri,
        state,
    };
    const oidcAuthUrl = oidcUrl(odicOptions);

    res.cookie('state', state,  { secure: true, httpOnly: true });
    console.log('Pre-flight login url called...');
    console.log('Redirecting to: ' + oidcAuthUrl);
    res.redirect(oidcAuthUrl);
});

app.post('/launches', async (req: express.Request, res: express.Response) => {
    console.log ('Lti launch called..');
    const jwtPayload = await getJWTPayload(req.body.id_token);
    if (!jwtPayload || !jwtPayload.verified) {
        res.send('An error occurred processing the id_token.');
        return;
    }
    console.log ('Got jwt: ' + JSON.stringify(jwtPayload));
    const targetUri = jwtPayload.targetLinkUri;
    console.log('targetUri: ' + targetUri);
    if ( targetUri.endsWith('uef') ) {
        const learnUrl = getLearnUrlFromJwtPayload(jwtPayload);
        console.log ('learnUrl: ' + learnUrl);
        const state = jwtPayload.locale;
        const authRedirectUrl = getOauth2AuthorizationUrl(learnUrl, state);
        console.log('Redirecting to: ' + authRedirectUrl);
        console.log('Redirecting to get 3LO code');
        res.redirect(authRedirectUrl);
    } else {
        return res.render('ltiLaunch', { jwtPayload } );
    }
});

app.get('/auth-done', async (req, res) => {
    console.log ('getting token for code: ' + req.query.code);
    try {
        const learnUrl = req.query.learn_url;
        const tokenData = await getUserAccessToken(learnUrl, req.query.code);
        console.log ('token data: ' + JSON.stringify(tokenData));
        const token = tokenData.access_token;
        const userUuid = tokenData.user_id;
        const launchUrl = Config.webAppHost + '/handleUefPanelAction';
        const assetsUrl = Config.webAppHost + '/assets';
        const locale = req.query.state;
        return res.render('uefLaunch', { token, learnUrl, userUuid, launchUrl, locale, assetsUrl } );
    } catch (ex) {
        console.log ('Error: ' + ex.message);
        res.send('An error occurred processing the id_token.');
        return;
    }
});

app.get('/handleUefPanelAction', (req, res) => {
    const action = req.query.action;
    const data = decodeURIComponent(req.query.data);
    console.log ('data context: ' + data);
    res.send(`This would handle this action of ${action}... data context is ${data}`);
});

if (Config.https) {
    https.createServer({
        cert: fs.readFileSync(Config.https.cert),
        key: fs.readFileSync(Config.https.key),
    }, app).listen(Config.webAppPort, () => {
        console.log(`Listening on port: ${Config.webAppPort}`);
    });
} else {
    app.listen(Config.webAppPort, () => {
        console.log(`Listening on port: ${Config.webAppPort}`);
    });
}
