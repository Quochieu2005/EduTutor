"use strict";

const swaggerSettings = {{ settings|safe }};
const schemaAuthNames = {{ schema_auth_names|safe }};
let schemaAuthFailed = false;
const plugins = [];

const reloadSchemaOnAuthChange = () => ({
  statePlugins: {
    auth: {
      wrapActions: {
        authorizeOauth2: (ori) => (...args) => {
          schemaAuthFailed = false;
          setTimeout(() => ui.specActions.download());
          return ori(...args);
        },
        authorize: (ori) => (...args) => {
          schemaAuthFailed = false;
          setTimeout(() => ui.specActions.download());
          return ori(...args);
        },
        logout: (ori) => (...args) => {
          schemaAuthFailed = false;
          setTimeout(() => ui.specActions.download());
          return ori(...args);
        },
      },
    },
  },
});

if (schemaAuthNames.length > 0) {
  plugins.push(reloadSchemaOnAuthChange);
}

const uiInitialized = () => {
  try {
    ui;
    return true;
  } catch {
    return false;
  }
};

const isSchemaUrl = (url) => uiInitialized()
  && url === new URL(ui.getConfigs().url, document.baseURI).href;

const responseInterceptor = (response) => {
  if (!response.ok && isSchemaUrl(response.url)) {
    console.warn("schema request received '" + response.status + "'. disabling credentials for schema till logout.");
    if (!schemaAuthFailed) {
      schemaAuthFailed = true;
      setTimeout(() => ui.specActions.download());
    }
  }
  return response;
};

const injectAuthCredentials = (request) => {
  let authorized;
  if (uiInitialized()) {
    const state = ui.getState().get('auth').get('authorized');
    if (state !== undefined && Object.keys(state.toJS()).length !== 0) authorized = state.toJS();
  } else if (![undefined, '{}'].includes(localStorage.authorized)) {
    authorized = JSON.parse(localStorage.authorized);
  }
  if (authorized === undefined) return;

  for (const authName of schemaAuthNames) {
    const authDef = authorized[authName];
    if (authDef === undefined || authDef.schema === undefined) continue;
    if (authDef.schema.type === 'http' && authDef.schema.scheme === 'bearer') {
      request.headers.Authorization = 'Bearer ' + authDef.value;
      return;
    }
    if (authDef.schema.type === 'http' && authDef.schema.scheme === 'basic') {
      request.headers.Authorization = 'Basic ' + btoa(authDef.value.username + ':' + authDef.value.password);
      return;
    }
    if (authDef.schema.type === 'apiKey' && authDef.schema.in === 'header') {
      request.headers[authDef.schema.name] = authDef.value;
      return;
    }
    if (authDef.schema.type === 'oauth2' && authDef.token.token_type === 'Bearer') {
      request.headers.Authorization = `Bearer ${authDef.token.access_token}`;
      return;
    }
  }
};

const requestInterceptor = (request) => {
  if (request.loadSpec && schemaAuthNames.length > 0 && !schemaAuthFailed) {
    try {
      injectAuthCredentials(request);
    } catch (error) {
      console.error('schema auth injection failed with error: ', error);
    }
  }
  if (!['GET', undefined].includes(request.method) && request.credentials === 'same-origin') {
    request.headers['{{ csrf_header_name }}'] = '{{ csrf_token }}';
  }
  return request;
};

// Đây là cấu hình chuẩn của Swagger UI Standalone: chính bundle của Swagger
// tạo logo, top bar và bố cục, không dùng header tự thiết kế.
const ui = SwaggerUIBundle({
  url: '{{ schema_url|escapejs }}',
  dom_id: '#swagger-ui',
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
  plugins,
  layout: 'StandaloneLayout',
  requestInterceptor,
  responseInterceptor,
  ...swaggerSettings,
});

{% if oauth2_config %}ui.initOAuth({{ oauth2_config|safe }});{% endif %}
