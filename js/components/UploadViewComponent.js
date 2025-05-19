// js/components/UploadViewComponent.js

const UploadViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    let global_message_element_ref;

    let saved_audit_input_element;
    let load_ongoing_audit_btn;
    let start_new_audit_navigation_btn; 

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes; 

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (UploadView t not found)";
            };
    }

    function handle_saved_audit_file_select(event) {
        const t = get_t_func();
        const file = event.target.files[0];
        if (file) {
            if (file.type !== "application/json") {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_must_be_json'), 'error');
                if (saved_audit_input_element) saved_audit_input_element.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const file_content_object = JSON.parse(e.target.result);
                    const validation_result = window.ValidationLogic.validate_saved_audit_file(file_content_object);

                    if (validation_result.isValid) {
                        const current_app_state_version = local_getState().saveFileVersion;
                        if (file_content_object.saveFileVersion > current_app_state_version) {
                            if (window.NotificationComponent) {
                                NotificationComponent.show_global_message(
                                    t('warning_save_file_newer_version', {
                                        fileVersionInFile: file_content_object.saveFileVersion,
                                        appVersion: current_app_state_version
                                    }),
                                    'warning', 8000);
                            }
                        }
                        if(local_dispatch && local_StoreActionTypes.LOAD_AUDIT_FROM_FILE) {
                            local_dispatch({
                                type: local_StoreActionTypes.LOAD_AUDIT_FROM_FILE,
                                payload: file_content_object
                            });
                            if (window.NotificationComponent) NotificationComponent.show_global_message(t('saved_audit_loaded_successfully'), 'success');
                            router_ref('audit_overview');
                        } else {
                            console.error("[UploadView] Cannot dispatch LOAD_AUDIT_FROM_FILE: dispatch or action type missing.");
                            if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_internal_state_update', {defaultValue: "Internal error: Could not update state."}), 'error');
                        }
                    } else {
                        if (window.NotificationComponent) NotificationComponent.show_global_message(validation_result.message, 'error');
                    }
                } catch (error) {
                    console.error("Fel vid parsning av JSON från sparad granskningsfil:", error);
                    if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_invalid_saved_audit_file'), 'error');
                }
            };
            reader.onerror = function() {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_read_error'), 'error');
            };
            reader.readAsText(file);
        }
        if(saved_audit_input_element) saved_audit_input_element.value = '';
    }

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router;
        
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes || !local_StoreActionTypes.LOAD_AUDIT_FROM_FILE || !local_StoreActionTypes.SET_RULE_FILE_CONTENT) {
            console.error("[UploadViewComponent] CRITICAL: StoreActionTypes (LOAD_AUDIT_FROM_FILE or SET_RULE_FILE_CONTENT) was not passed to init or is undefined.");
            local_StoreActionTypes = { 
                ...local_StoreActionTypes,
                LOAD_AUDIT_FROM_FILE: 'LOAD_AUDIT_FROM_FILE_ERROR_MISSING',
                SET_RULE_FILE_CONTENT: 'SET_RULE_FILE_CONTENT_ERROR_MISSING'
            };
        }

        if (window.NotificationComponent && typeof window.NotificationComponent.get_global_message_element_reference === 'function') {
            global_message_element_ref = NotificationComponent.get_global_message_element_reference();
        } else {
            console.error("[UploadViewComponent] NotificationComponent.get_global_message_element_reference not available!");
        }
        try {
            if (window.Helpers && typeof window.Helpers.load_css === 'function') {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await window.Helpers.load_css(CSS_PATH);
                }
            } else {
                console.warn("[UploadViewComponent] Helpers.load_css not available.");
            }
        } catch (error) {
            console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error);
        }
    }

    function render() {
        if (!app_container_ref || !window.Helpers || !window.Helpers.create_element) {
            console.error("[UploadViewComponent] app_container_ref or Helpers.create_element is MISSING in render!");
            if (app_container_ref) app_container_ref.innerHTML = "<p>Error rendering Upload View.</p>";
            return;
        }
        app_container_ref.innerHTML = '';
        const t = get_t_func();

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
            if (window.NotificationComponent && typeof window.NotificationComponent.clear_global_message === 'function' &&
                !global_message_element_ref.classList.contains('message-error') &&
                !global_message_element_ref.classList.contains('message-warning')) {
                NotificationComponent.clear_global_message();
            }
        }

        const title = window.Helpers.create_element('h1', { text_content: t('app_title') });
        const intro_text = window.Helpers.create_element('p', { text_content: t('upload_view_intro') });

        load_ongoing_audit_btn = window.Helpers.create_element('button', {
            id: 'load-ongoing-audit-btn',
            class_name: ['button', 'button-secondary'],
            html_content: `<span>${t('upload_ongoing_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('upload_file', ['currentColor'], 18) : '')
        });

        start_new_audit_navigation_btn = window.Helpers.create_element('button', {
            id: 'start-new-audit-nav-btn',
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('start_new_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('add', ['currentColor'], 18) : '')
        });

        const button_group = window.Helpers.create_element('div', { class_name: 'button-group' });
        button_group.appendChild(start_new_audit_navigation_btn); // Byt plats på knapparna visuellt
        button_group.appendChild(load_ongoing_audit_btn);


        saved_audit_input_element = window.Helpers.create_element('input', {
            id: 'saved-audit-input-upload-view', // Unikt ID
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });

        app_container_ref.appendChild(title);
        app_container_ref.appendChild(intro_text);
        app_container_ref.appendChild(button_group);
        app_container_ref.appendChild(saved_audit_input_element);

        start_new_audit_navigation_btn.addEventListener('click', () => {
            if (local_dispatch && local_StoreActionTypes.SET_RULE_FILE_CONTENT) {
                // Nollställ ruleFileContent så att MetadataView visar urvalet
                local_dispatch({
                    type: local_StoreActionTypes.SET_RULE_FILE_CONTENT,
                    payload: { ruleFileContent: null }
                });
                router_ref('metadata'); 
            } else {
                console.error("[UploadView] Cannot dispatch SET_RULE_FILE_CONTENT: dispatch or action type missing.");
                 if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_internal_state_update', {defaultValue: "Internal error: Could not update state."}), 'error');
            }
        });
        
        load_ongoing_audit_btn.addEventListener('click', () => { if(saved_audit_input_element) saved_audit_input_element.click(); });
        if(saved_audit_input_element) saved_audit_input_element.addEventListener('change', handle_saved_audit_file_select);
    }

    function destroy() {
        if (saved_audit_input_element) saved_audit_input_element.removeEventListener('change', handle_saved_audit_file_select);
        
        // Knapparna återskapas, så ingen specifik borttagning av lyssnare här behövs normalt
        // if (load_ongoing_audit_btn) load_ongoing_audit_btn.removeEventListener('click', ...);
        // if (start_new_audit_navigation_btn) start_new_audit_navigation_btn.removeEventListener('click', ...);

        saved_audit_input_element = null;
        load_ongoing_audit_btn = null;
        start_new_audit_navigation_btn = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const UploadViewComponent = UploadViewComponent_internal;