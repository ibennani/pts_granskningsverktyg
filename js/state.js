// js/state.js

const APP_STATE_KEY = 'digitalTillsynAppCentralState';
const APP_STATE_VERSION = '2.0.0'; // Version för store-baserad state

export const ActionTypes = {
    INITIALIZE_NEW_AUDIT: 'INITIALIZE_NEW_AUDIT',
    LOAD_AUDIT_FROM_FILE: 'LOAD_AUDIT_FROM_FILE',
    UPDATE_METADATA: 'UPDATE_METADATA',
    ADD_SAMPLE: 'ADD_SAMPLE',
    UPDATE_SAMPLE: 'UPDATE_SAMPLE',
    DELETE_SAMPLE: 'DELETE_SAMPLE',
    SET_AUDIT_STATUS: 'SET_AUDIT_STATUS',
    UPDATE_REQUIREMENT_RESULT: 'UPDATE_REQUIREMENT_RESULT',
    SET_RULE_FILE_CONTENT: 'SET_RULE_FILE_CONTENT' // NYTT
};

const initial_state = {
    saveFileVersion: APP_STATE_VERSION,
    ruleFileContent: null, // Viktigt att denna är null initialt för nya logiken
    auditMetadata: {
        caseNumber: '',
        actorName: '',
        actorLink: '',
        auditorName: '',
        internalComment: ''
    },
    auditStatus: 'not_started',
    startTime: null,
    endTime: null,
    samples: [],
    uiSettings: {}
};

let internal_state = initial_state;
let listeners = [];

function get_current_iso_datetime_utc_internal() {
    return new Date().toISOString();
}

function root_reducer(current_state, action) {
    console.log('[State.js] root_reducer called. Action:', action.type, 'Payload:', action.payload ? JSON.parse(JSON.stringify(action.payload)) : 'No payload');
    
    let new_state_slice;

    switch (action.type) {
        case ActionTypes.INITIALIZE_NEW_AUDIT:
            return {
                ...current_state, 
                saveFileVersion: APP_STATE_VERSION,
                ruleFileContent: action.payload.ruleFileContent,
                auditStatus: 'not_started', 
                samples: [], 
                startTime: null, 
                endTime: null
                // Behåll befintlig auditMetadata om det är önskvärt, annars återställ den också:
                // auditMetadata: { ...initial_state.auditMetadata },
            };

        case ActionTypes.LOAD_AUDIT_FROM_FILE:
            if (action.payload && typeof action.payload === 'object') {
                if (action.payload.saveFileVersion && action.payload.saveFileVersion !== APP_STATE_VERSION) {
                    console.warn(`[State.js] LOAD_AUDIT_FROM_FILE: Version mismatch. File version: ${action.payload.saveFileVersion}, App version: ${APP_STATE_VERSION}. Loading anyway but stamping with current app version.`);
                }
                return {
                    ...action.payload,
                    saveFileVersion: APP_STATE_VERSION 
                };
            }
            console.warn('[State.js] LOAD_AUDIT_FROM_FILE: Invalid payload.', action.payload);
            return current_state;

        case ActionTypes.UPDATE_METADATA:
            return {
                ...current_state,
                auditMetadata: {
                    ...current_state.auditMetadata,
                    ...action.payload
                }
            };

        case ActionTypes.ADD_SAMPLE:
            if (!action.payload || !action.payload.id) {
                console.error('[State.js] ADD_SAMPLE: Payload must be a sample object with an id.');
                return current_state;
            }
            return {
                ...current_state,
                samples: [...current_state.samples, action.payload]
            };

        case ActionTypes.UPDATE_SAMPLE:
            if (!action.payload || !action.payload.sampleId || !action.payload.updatedSampleData) {
                console.error('[State.js] UPDATE_SAMPLE: Invalid payload.');
                return current_state;
            }
            return {
                ...current_state,
                samples: current_state.samples.map(sample =>
                    sample.id === action.payload.sampleId
                        ? { ...sample, ...action.payload.updatedSampleData, requirementResults: sample.requirementResults } 
                        : sample
                )
            };

        case ActionTypes.DELETE_SAMPLE:
            if (!action.payload || !action.payload.sampleId) {
                console.error('[State.js] DELETE_SAMPLE: Invalid payload.');
                return current_state;
            }
            return {
                ...current_state,
                samples: current_state.samples.filter(sample => sample.id !== action.payload.sampleId)
            };

        case ActionTypes.SET_AUDIT_STATUS:
            if (!action.payload || !action.payload.status) {
                console.error('[State.js] SET_AUDIT_STATUS: Invalid payload.');
                return current_state;
            }
            new_state_slice = { auditStatus: action.payload.status };
            if (action.payload.status === 'in_progress' && !current_state.startTime) { 
                new_state_slice.startTime = get_current_iso_datetime_utc_internal();
                new_state_slice.endTime = null; 
            } else if (action.payload.status === 'locked' && !current_state.endTime) { 
                new_state_slice.endTime = get_current_iso_datetime_utc_internal();
            } else if (action.payload.status === 'in_progress' && current_state.auditStatus === 'locked') {
                new_state_slice.endTime = null; 
            }
            return {
                ...current_state,
                ...new_state_slice
            };

        case ActionTypes.UPDATE_REQUIREMENT_RESULT:
            if (!action.payload || !action.payload.sampleId || !action.payload.requirementId || action.payload.newRequirementResult === undefined) {
                console.error('[State.js] UPDATE_REQUIREMENT_RESULT: Invalid payload.', action.payload);
                return current_state;
            }
            const { sampleId, requirementId, newRequirementResult } = action.payload;
            return {
                ...current_state,
                samples: current_state.samples.map(sample => {
                    if (sample.id === sampleId) {
                        const updatedRequirementResults = {
                            ...sample.requirementResults,
                            [requirementId]: newRequirementResult
                        };
                        return {
                            ...sample,
                            requirementResults: updatedRequirementResults
                        };
                    }
                    return sample;
                })
            };
        
        case ActionTypes.SET_RULE_FILE_CONTENT: 
            // När en ny regelfil väljs (eller rensas genom att sätta payload.ruleFileContent till null)
            // ska vi återställa relevant state som om en ny granskning påbörjas med DENNA regelfil.
            // AuditMetadata kan behållas om det är önskvärt, men samples etc. bör nollställas.
            return {
                ...current_state, // Behåll befintlig auditMetadata och uiSettings
                ruleFileContent: action.payload.ruleFileContent, // Kan vara null
                auditStatus: 'not_started',
                samples: [],
                startTime: null,
                endTime: null
            };

        default:
            console.warn(`[State.js] Unknown action type: ${action.type}`);
            return current_state;
    }
}

function dispatch(action) {
    if (!action || typeof action.type !== 'string') {
        console.error('[State.js] Invalid action dispatched. Action must be an object with a "type" property.', action);
        return;
    }
    try {
        const new_state = root_reducer(internal_state, action);
        internal_state = new_state;
        saveStateToSessionStorage(internal_state);
        notify_listeners();
    } catch (error) {
        console.error('[State.js] Error in dispatch or reducer:', error, 'Action:', action);
    }
}

function getState() {
    return JSON.parse(JSON.stringify(internal_state));
}

function subscribe(listener_function) {
    if (typeof listener_function !== 'function') {
        console.error('[State.js] Listener must be a function.');
        return () => {}; 
    }
    listeners.push(listener_function);
    return () => { 
        listeners = listeners.filter(l => l !== listener_function);
    };
}

function notify_listeners() {
    const currentSnapshot = getState(); 
    listeners.forEach(listener => {
        try {
            listener(currentSnapshot);
        } catch (error) {
            console.error('[State.js] Error in listener function:', error);
        }
    });
}

function loadStateFromSessionStorage() {
    const serializedState = sessionStorage.getItem(APP_STATE_KEY);
    if (serializedState === null) {
        console.log('[State.js] No state found in sessionStorage. Using initial_state.');
        return JSON.parse(JSON.stringify(initial_state));
    }
    try {
        const storedState = JSON.parse(serializedState);
        if (storedState.saveFileVersion === APP_STATE_VERSION) {
            console.log('[State.js] Loaded state from sessionStorage. Version matches.');
            return storedState;
        } else {
            console.warn(`[State.js] State version mismatch in sessionStorage. Found ${storedState.saveFileVersion}, expected ${APP_STATE_VERSION}. Clearing stored state and using initial_state.`);
            sessionStorage.removeItem(APP_STATE_KEY);
            return JSON.parse(JSON.stringify(initial_state));
        }
    } catch (e) {
        console.error("[State.js] Could not load state from sessionStorage due to parsing error:", e);
        sessionStorage.removeItem(APP_STATE_KEY);
        return JSON.parse(JSON.stringify(initial_state));
    }
}

function saveStateToSessionStorage(state_to_save) {
    try {
        const complete_state_to_save = { ...state_to_save, saveFileVersion: APP_STATE_VERSION };
        const serializedState = JSON.stringify(complete_state_to_save);
        sessionStorage.setItem(APP_STATE_KEY, serializedState);
    } catch (e) {
        console.error("[State.js] Could not save state to sessionStorage:", e);
    }
}

internal_state = loadStateFromSessionStorage();
if (JSON.stringify(internal_state) === JSON.stringify(initial_state) && sessionStorage.getItem(APP_STATE_KEY) === null) {
    saveStateToSessionStorage(internal_state);
}

export { dispatch, getState, subscribe, ActionTypes as StoreActionTypes, initial_state as StoreInitialState };

console.log('[State.js] Store initialized and API exported.');