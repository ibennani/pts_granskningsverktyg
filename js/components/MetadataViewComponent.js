// js/components/MetadataViewComponent.js

const MetadataViewComponent_internal = (function () {
    'use strict';

    const CSS_PATH = 'css/components/metadata_view_component.css';
    const AUDIT_RULES_INDEX_PATH = 'audit_rules/audit_rules_index.json';
    const AUDIT_RULES_BASE_PATH = 'audit_rules/';

    let app_container_ref;
    let navigate_and_set_hash_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let ValidationLogic_validate_rule_file_json;

    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;
    let global_message_element_ref;
    let metadata_form_element_ref;
    let rule_selection_container_ref;
    let selected_rule_title_display_ref;
    let metadata_form_actual_container_ref; // Wrapper för det faktiska formuläret

    function get_t_internally() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (MetadataView t not found)";
            };
    }

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element && ValidationLogic_validate_rule_file_json) return true;
        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("MetadataView: Translation.t is missing!"); all_assigned = false; }
        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            Helpers_escape_html = window.Helpers.escape_html;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_add_protocol_if_missing || !Helpers_load_css || !Helpers_escape_html) {
                console.error("MetadataView: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: Helpers module is missing!"); all_assigned = false; }
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                console.error("MetadataView: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: NotificationComponent module is missing!"); all_assigned = false; }
        if (window.ValidationLogic && window.ValidationLogic.validate_rule_file_json) {
            ValidationLogic_validate_rule_file_json = window.ValidationLogic.validate_rule_file_json;
        } else {
            console.error("MetadataView: ValidationLogic.validate_rule_file_json is missing!");
            all_assigned = false;
        }
        return all_assigned;
    }

    async function init(_app_container, _navigate_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        navigate_and_set_hash_ref = _navigate_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_METADATA || !local_StoreActionTypes.INITIALIZE_NEW_AUDIT) {
            console.error("[MetadataViewComponent] CRITICAL: StoreActionTypes for UPDATE_METADATA or INITIALIZE_NEW_AUDIT missing.");
            local_StoreActionTypes = {
                ...local_StoreActionTypes,
                UPDATE_METADATA: 'UPDATE_METADATA_ERROR_MISSING',
                INITIALIZE_NEW_AUDIT: 'INITIALIZE_NEW_AUDIT_ERROR_MISSING'
            };
        }
        if(NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        // CSS laddas nu globalt eller av main.js
    }

    function process_rule_file_selection(rule_file_content) {
        const t = get_t_internally();
        if (!rule_file_content || !rule_file_content.metadata) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_invalid_rule_file_structure'), 'error');
            return;
        }

        if (local_dispatch && local_StoreActionTypes.INITIALIZE_NEW_AUDIT) {
            local_dispatch({
                type: local_StoreActionTypes.INITIALIZE_NEW_AUDIT,
                payload: { 
                    ruleFileContent: rule_file_content
                }
            });
        } else {
            console.error("[MetadataView] Cannot dispatch INITIALIZE_NEW_AUDIT: dispatch or action type missing.");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_state_update'), 'error');
            return;
        }
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
    }

    async function handle_predefined_rule_click(rule_info_from_index) {
        const t = get_t_internally();
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        try {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('loading_rule_file', {fileName: rule_info_from_index.fileName}), 'info');

            const response = await fetch(`${AUDIT_RULES_BASE_PATH}${rule_info_from_index.fileName}?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const rule_file_content = await response.json();

            const validation_result = ValidationLogic_validate_rule_file_json(rule_file_content);
            if (validation_result.isValid) {
                process_rule_file_selection(rule_file_content);
            } else {
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(validation_result.message, 'error');
            }
        } catch (error) {
            console.error(`Error fetching or parsing rule file ${rule_info_from_index.fileName}:`, error);
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_fetching_rule_file', { fileName: rule_info_from_index.fileName }), 'error');
        }
    }

    function handle_custom_rule_file_upload(event) {
        const t = get_t_internally();
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== "application/json") {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_file_must_be_json'), 'error');
            event.target.value = '';
            return;
        }
        if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('loading_rule_file', {fileName: file.name}), 'info');

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const json_content = JSON.parse(e.target.result);
                const validation_result = ValidationLogic_validate_rule_file_json(json_content);

                if (validation_result.isValid) {
                    process_rule_file_selection(json_content);
                } else {
                    if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(validation_result.message, 'error');
                }
            } catch (error) {
                console.error("Fel vid parsning av JSON från uppladdad regelfil:", error);
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('rule_file_invalid_json'), 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = function() {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_file_read_error'), 'error');
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    async function render_rule_selection_ui(parent_container) {
        const t = get_t_internally();
        if (!Helpers_create_element) {
            parent_container.textContent = "Error: Helpers not loaded.";
            return;
        }

        if (!rule_selection_container_ref || !rule_selection_container_ref.parentNode) {
            rule_selection_container_ref = Helpers_create_element('div', { class_name: 'rule-selection-container' });
            parent_container.appendChild(rule_selection_container_ref);
        } else {
            rule_selection_container_ref.innerHTML = '';
        }

        const header_div = Helpers_create_element('div', { class_name: 'rule-selection-header'});
        header_div.appendChild(Helpers_create_element('h1', { text_content: t('what_to_audit_title') }));
        header_div.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('rule_selection_instruction') }));
        rule_selection_container_ref.appendChild(header_div);

        const button_row = Helpers_create_element('div', { class_name: 'rulefile-button-row' });
        const predefined_rules_group = Helpers_create_element('div', { class_name: 'predefined-rules-group' });
        const upload_custom_rule_group = Helpers_create_element('div', { class_name: 'upload-custom-rule-group' });

        try {
            const index_response = await fetch(`${AUDIT_RULES_INDEX_PATH}?v=${new Date().getTime()}`);
            if (!index_response.ok) throw new Error(`HTTP error ${index_response.status} fetching index`);
            const rules_from_index = await index_response.json();

            if (Array.isArray(rules_from_index) && rules_from_index.length > 0) {
                rules_from_index.forEach(rule_info => {
                    if (rule_info && rule_info.fileName && rule_info.buttonText) {
                        const rule_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-default'],
                            text_content: rule_info.buttonText,
                            event_listeners: { click: () => handle_predefined_rule_click(rule_info) }
                        });
                        predefined_rules_group.appendChild(rule_button);
                    } else {
                        console.warn("Skipping rule due to missing data in index:", rule_info);
                    }
                });
            } else {
                 predefined_rules_group.appendChild(Helpers_create_element('p', {text_content: t('no_rule_files_found_in_index')}));
            }
        } catch (error) {
            console.error("Error fetching or processing rule index:", error);
            predefined_rules_group.appendChild(Helpers_create_element('p', { class_name: 'text-danger', text_content: t('error_fetching_rule_index') }));
        }

        const upload_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            text_content: t('upload_custom_rule_file_button'),
            attributes: {'aria-label': t('upload_custom_rule_file_button')}
        });
        const file_input = Helpers_create_element('input', {
            id: 'custom-rule-file-input-metadata-view',
            attributes: { type: 'file', accept: '.json', style: 'display:none;', 'aria-hidden': 'true' }
        });
        file_input.addEventListener('change', handle_custom_rule_file_upload);
        upload_button.addEventListener('click', () => file_input.click());

        upload_custom_rule_group.appendChild(upload_button);
        upload_custom_rule_group.appendChild(file_input);

        button_row.appendChild(predefined_rules_group);
        button_row.appendChild(upload_custom_rule_group);
        rule_selection_container_ref.appendChild(button_row);

        if (!selected_rule_title_display_ref || !selected_rule_title_display_ref.parentNode) {
            selected_rule_title_display_ref = Helpers_create_element('div', {
                class_name: 'selected-rule-title-display'
            });
            rule_selection_container_ref.appendChild(selected_rule_title_display_ref);
        }
        selected_rule_title_display_ref.setAttribute('hidden', 'true');
    }

    function render_metadata_form_inputs(container_for_form_elements, metadata_from_store, is_editable) {
        const t = get_t_internally();
        if (!Helpers_create_element) return;

        container_for_form_elements.innerHTML = '';

        if (is_editable) {
            metadata_form_element_ref = Helpers_create_element('form');
            metadata_form_element_ref.addEventListener('submit', handle_submit_metadata_form);

            const case_field = create_form_field('caseNumber', 'case_number', 'text', metadata_from_store.caseNumber, false, !is_editable);
            case_number_input = case_field.input_element;
            metadata_form_element_ref.appendChild(case_field.form_group);

            const actor_field = create_form_field('actorName', 'actor_name', 'text', metadata_from_store.actorName, false, !is_editable);
            actor_name_input = actor_field.input_element;
            metadata_form_element_ref.appendChild(actor_field.form_group);

            const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', metadata_from_store.actorLink, true, !is_editable);
            actor_link_input = actor_link_field.input_element;
            metadata_form_element_ref.appendChild(actor_link_field.form_group);

            const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', metadata_from_store.auditorName, false, !is_editable);
            auditor_name_input = auditor_field.input_element;
            metadata_form_element_ref.appendChild(auditor_field.form_group);

            const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', metadata_from_store.internalComment, false, !is_editable);
            internal_comment_input = comment_field.input_element;
            metadata_form_element_ref.appendChild(comment_field.form_group);

            const form_actions_wrapper = Helpers_create_element('div', { class_name: 'form-actions metadata-actions' });
            const submit_button = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                attributes: { type: 'submit' },
                html_content: `<span>${t('continue_to_samples')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '')
            });
            form_actions_wrapper.appendChild(submit_button);
            metadata_form_element_ref.appendChild(form_actions_wrapper);
            container_for_form_elements.appendChild(metadata_form_element_ref);
        } else {
            const static_display_div = Helpers_create_element('div', { class_name: 'static-metadata-display' });
            static_display_div.appendChild(create_static_field('case_number', metadata_from_store.caseNumber));
            static_display_div.appendChild(create_static_field('actor_name', metadata_from_store.actorName));
            static_display_div.appendChild(create_static_field('actor_link', metadata_from_store.actorLink, true));
            static_display_div.appendChild(create_static_field('auditor_name', metadata_from_store.auditorName));
            static_display_div.appendChild(create_static_field('internal_comment', metadata_from_store.internalComment));
            container_for_form_elements.appendChild(static_display_div);

            const current_global_state_for_readonly_button = local_getState();
            const actions_div_readonly = Helpers_create_element('div', { class_name: 'metadata-actions' });
            const target_view_for_readonly = (current_global_state_for_readonly_button.auditStatus === 'in_progress' || current_global_state_for_readonly_button.auditStatus === 'locked')
                ? 'audit_overview'
                : 'sample_management';
            const button_text_key_for_readonly = (current_global_state_for_readonly_button.auditStatus === 'in_progress' || current_global_state_for_readonly_button.auditStatus === 'locked')
                ? 'view_audit_overview_button'
                : 'view_samples_button';

            const view_next_step_button = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t(button_text_key_for_readonly, {defaultValue: "View Next Step"})}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '')
            });
            view_next_step_button.addEventListener('click', (e) => {
                e.preventDefault();
                if (navigate_and_set_hash_ref) navigate_and_set_hash_ref(target_view_for_readonly);
            });
            actions_div_readonly.appendChild(view_next_step_button);
            container_for_form_elements.appendChild(actions_div_readonly);
        }
    }

    function save_metadata_to_store() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (!current_global_state) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_no_active_audit_to_save_metadata'), "error");
            return false;
        }
        if (current_global_state.auditStatus !== 'not_started' || !current_global_state.ruleFileContent) {
            console.warn("MetadataView: save_metadata_to_store called inappropriately.");
            return true;
        }
        if (!case_number_input || !actor_name_input || !actor_link_input || !auditor_name_input || !internal_comment_input) {
            console.error("MetadataView: Metadata input elements not defined in save_metadata_to_store.");
            return false;
        }
        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value && Helpers_add_protocol_if_missing) {
            actor_link_value = Helpers_add_protocol_if_missing(actor_link_value);
        }
        const metadata_payload = {
            caseNumber: case_number_input.value.trim(),
            actorName: actor_name_input.value.trim(),
            actorLink: actor_link_value,
            auditorName: auditor_name_input.value.trim(),
            internalComment: internal_comment_input.value.trim()
        };
        if (local_dispatch && local_StoreActionTypes.UPDATE_METADATA) {
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_METADATA,
                payload: metadata_payload
            });
        } else {
            console.error("[MetadataView] Cannot dispatch UPDATE_METADATA: dispatch or action type missing.");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_state_update'), 'error');
            return false;
        }
        return true;
    }

    function handle_submit_metadata_form(event) {
        event.preventDefault();
        if (save_metadata_to_store()) {
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
            if (navigate_and_set_hash_ref) {
                navigate_and_set_hash_ref('sample_management');
            }
        }
    }

    function create_form_field(id, label_key, type = 'text', current_value = '', remove_placeholder = false, is_readonly = false) {
        const t = get_t_internally();
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        const label = Helpers_create_element('label', { attributes: { for: id }, text_content: t(label_key) });
        let input_element;
        const attributes = { type: type };
        if (is_readonly) { attributes.readonly = true; attributes.tabindex = "-1"; }
        if (type === 'textarea') {
            input_element = Helpers_create_element('textarea', { id: id, class_name: 'form-control', attributes: { rows: '3', ...attributes } });
            input_element.value = current_value;
        } else {
            input_element = Helpers_create_element('input', { id: id, class_name: 'form-control', attributes: attributes });
            input_element.value = current_value;
        }
        if (is_readonly) { input_element.classList.add('readonly-textarea'); }
        form_group.appendChild(label);
        form_group.appendChild(input_element);
        return { form_group, input_element };
    }

    function create_static_field(label_key, value, is_link = false) {
        const t = get_t_internally();
        const field_div = Helpers_create_element('div', { class_name: 'static-field' });
        field_div.appendChild(Helpers_create_element('strong', { text_content: t(label_key) + ":" }));
        if (value && typeof value === 'string' && value.trim() !== '') {
            if (is_link) {
                const safe_url = Helpers_add_protocol_if_missing ? Helpers_add_protocol_if_missing(value) : value;
                field_div.appendChild(document.createTextNode(' '));
                field_div.appendChild(Helpers_create_element('a', { href: safe_url, text_content: value, attributes: { target: '_blank', rel: 'noopener noreferrer' } }));
            } else {
                if (label_key === 'internal_comment' && value.includes('\n')) {
                    value.split('\n').forEach((line, index) => {
                        if (index > 0) field_div.appendChild(Helpers_create_element('br'));
                        field_div.appendChild(document.createTextNode(' ' + Helpers_escape_html(line)));
                    });
                } else {
                    field_div.appendChild(document.createTextNode(' ' + Helpers_escape_html(value)));
                }
            }
        } else {
            field_div.appendChild(document.createTextNode(' ' + t('value_not_set', {defaultValue: '(Not set)'})));
        }
        return field_div;
    }

    async function render() {
        assign_globals_once();
        const t = get_t_internally();
        const current_global_state = local_getState();
        console.log(
            "[MetadataView RENDER START] ruleFileContent:",
            current_global_state.ruleFileContent && current_global_state.ruleFileContent.metadata
                ? current_global_state.ruleFileContent.metadata.title
                : null,
            "auditStatus:", current_global_state.auditStatus
        );

        if (!app_container_ref || !Helpers_create_element || !t) {
            console.error("MetadataView: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_metadata_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate metadata-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if (NotificationComponent_clear_global_message &&
                !global_message_element_ref.classList.contains('message-error') &&
                !global_message_element_ref.classList.contains('message-warning')) {
                NotificationComponent_clear_global_message();
            }
        }

        if (!metadata_form_actual_container_ref) {
            metadata_form_actual_container_ref = Helpers_create_element('div', { class_name: 'metadata-form-actual-container' });
        }
        metadata_form_actual_container_ref.innerHTML = '';
        metadata_form_actual_container_ref.classList.add('hidden');

        if (!current_global_state.ruleFileContent) {
            console.log("[MetadataView RENDER] No ruleFileContent, rendering rule selection UI.");
            await render_rule_selection_ui(plate_element);
            plate_element.appendChild(metadata_form_actual_container_ref);
        } else {
            console.log("[MetadataView RENDER] ruleFileContent FOUND, rendering title and metadata form.");
            if (rule_selection_container_ref && rule_selection_container_ref.parentNode) {
                rule_selection_container_ref.setAttribute('hidden', 'true');
            }

            if (!selected_rule_title_display_ref || !selected_rule_title_display_ref.parentNode) {
                selected_rule_title_display_ref = Helpers_create_element('div', { class_name: 'selected-rule-title-display' });
                if (rule_selection_container_ref && rule_selection_container_ref.parentNode) {
                    rule_selection_container_ref.insertAdjacentElement('afterend', selected_rule_title_display_ref);
                } else {
                    plate_element.insertBefore(selected_rule_title_display_ref, plate_element.firstChild);
                }
            }
            selected_rule_title_display_ref.textContent = current_global_state.ruleFileContent.metadata.title || t('unknown_rule_file_title');
            selected_rule_title_display_ref.removeAttribute('hidden');

            const metadata_header_title = Helpers_create_element('h1', {
                text_content: t('audit_metadata_title'),
                class_name: 'metadata-section-title'
            });
            const metadata_header_instruction = Helpers_create_element('p', {
                class_name: 'view-intro-text metadata-section-intro',
                text_content: t('metadata_form_instruction')
            });

            plate_element.appendChild(metadata_header_title);
            plate_element.appendChild(metadata_header_instruction);

            plate_element.appendChild(metadata_form_actual_container_ref);
            metadata_form_actual_container_ref.classList.remove('hidden');

            const metadata_from_store = current_global_state.auditMetadata || {};
            const is_editable = current_global_state.auditStatus === 'not_started';
            render_metadata_form_inputs(metadata_form_actual_container_ref, metadata_from_store, is_editable);

            if (is_editable && NotificationComponent_show_global_message &&
                (!global_message_element_ref || global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim() ||
                 (!global_message_element_ref.classList.contains('message-error') && !global_message_element_ref.classList.contains('message-warning')))
            ) {
                NotificationComponent_show_global_message(t('metadata_form_intro'), "info");
            }
        }
    }

    function destroy() {
        if (metadata_form_element_ref) {
            metadata_form_element_ref.removeEventListener('submit', handle_submit_metadata_form);
            metadata_form_element_ref = null;
        }
        const file_input_for_custom_upload = document.getElementById('custom-rule-file-input-metadata-view');
        if (file_input_for_custom_upload) {
            file_input_for_custom_upload.removeEventListener('change', handle_custom_rule_file_upload);
        }

        case_number_input = null; actor_name_input = null; actor_link_input = null;
        auditor_name_input = null; internal_comment_input = null;
    }

    return { init, render, destroy };
})();

export const MetadataViewComponent = MetadataViewComponent_internal;
