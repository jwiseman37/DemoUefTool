interface IJWTHeader {
    kid: string;
}

interface IJWTBody extends Record<string, any> {
    aud: string[] | string;
}

export class JWTPayload {
    public verified: boolean = false;

    private _header: IJWTHeader;
    private _body: IJWTBody;
    private _clientId: string = '';
    private _version: string = '';
    private _locale: string = '';
    private _targetLinkUri: string = '';
    private _returnUrl: string = '';
    private _lmsHost: string = '';
    private _customParams: string = '';
    private _sessionToken: string = '';

    constructor(idToken: string) {
        const parts = idToken.split('.');
        this._header = JSON.parse(Buffer.from(parts[0], 'base64').toString()) || {};
        this._body = JSON.parse(Buffer.from(parts[1], 'base64').toString()) || {};
        this.parseBody();
    }

    private parseBody(): void {
        if (this._body.aud instanceof Array) {
            this._clientId = this._body.aud[0];
        } else {
            this._clientId = this._body.aud;
        }

        this._version = this._body['https://purl.imsglobal.org/spec/lti/claim/version'];
        this._locale = this._body.locale;
        this._targetLinkUri = this._body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];
        this._returnUrl = this._body['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'].return_url;
        this._lmsHost = this._body['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].url;
        this._customParams = JSON.stringify(this._body['https://purl.imsglobal.org/spec/lti/claim/custom']);
        this._sessionToken = this._body['https://blackboard.com/lti/claim/one_time_session_token'];
    }

    get kid(): string {
        return this._header.kid;
    }

    get version(): string {
        return this._version;
    }

    get clientId(): string {
        return this._clientId;
    }

    get locale(): string {
        return this._locale;
    }

    get targetLinkUri(): string {
        return this._targetLinkUri;
    }

    get returnUrl(): string {
        return this._returnUrl;
    }

    get lmsHost(): string {
        return this._lmsHost;
    }

    get customParams(): string {
        return this._customParams;
    }

    get sessionToken(): string {
        return this._sessionToken;
    }
}
