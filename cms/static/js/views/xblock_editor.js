/**
 * XBlockEditorView displays the authoring view of an xblock, and allows the user to switch between
 * the available modes.
 */
define(["jquery", "underscore", "gettext", "js/views/xblock", "js/views/metadata", "js/collections/metadata",
        "jquery.inputnumber"],
    function ($, _, gettext, XBlockView, MetadataView, MetadataCollection) {

        var XBlockEditorView = XBlockView.extend({
            // takes XBlockInfo as a model

            options: $.extend({}, XBlockView.prototype.options, {
                view: 'studio_view'
            }),

            initialize: function() {
                XBlockView.prototype.initialize.call(this);
                this.view = this.options.view;
            },

            xblockReady: function(xblock) {
                XBlockView.prototype.xblockReady.call(this, xblock);
                this.initializeEditors();
            },

            initializeEditors: function() {
                var metadataEditor,
                    defaultMode = 'editor';

                if (!this.hasCustomTabs()) {
                    // TODO does this cause any problems with the video player?
                    // Don't want to go into createMetadataEditor because tabbed editor
                    // will be using a metadata editor, and there will be conflicts.
                    this.metadataEditor = this.createMetadataEditor();
                    if (this.getDataEditor()) {
                        defaultMode = 'editor';
                    } else if (metadataEditor) {
                        defaultMode = 'settings';
                    }
                    this.selectMode(defaultMode);
                }
            },

            getDefaultModes: function() {
                return [
                    { id: 'editor', name: gettext("Editor")},
                    { id: 'settings', name: gettext("Settings")}
                ];
            },

            hasCustomTabs: function() {
                return this.$('.editor-with-tabs').length > 0;
            },

            hasCustomButtons: function() {
                return this.$('.editor-with-buttons').length > 0;
            },

            createMetadataEditor: function() {
                var metadataEditor,
                    metadataData,
                    models = [],
                    key,
                    xblock = this.xblock,
                    metadataView = null;
                metadataEditor = this.$('.metadata_edit');
                if (metadataEditor.length === 1) {
                    metadataData = metadataEditor.data('metadata');
                    for (key in metadataData) {
                        if (metadataData.hasOwnProperty(key)) {
                            models.push(metadataData[key]);
                        }
                    }
                    metadataView = new MetadataView.Editor({
                        el: metadataEditor,
                        collection: new MetadataCollection(models)
                    });
                    if (xblock.setMetadataEditor) {
                        xblock.setMetadataEditor(metadataView);
                    }
                }
                return metadataView;
            },

            saveEditorTabs: function () {
                var payload = {};
                _.each(this.xblockElements, function(element) {
                    var tab_id = element.element.parent().attr("data-tab-id");
                    if (element.collectFieldData) {
                        payload[tab_id] = {"fields": element.collectFieldData()};
                    }
                    else if (element.collectXmlData) {
                        payload[tab_id] = {"xml": element.collectXmlData()};
                    }
                });

                var handler_url = this.xblock.runtime.handlerUrl(this.xblock.element, "save_tab_data");
                return $.post(handler_url, JSON.stringify(payload)); //.success()
            },

            getDataEditor: function() {
                var editor = this.$('.wrapper-comp-editor');
                return editor.length === 1 ? editor : null;
            },

            getMetadataEditor: function() {
                return this.metadataEditor;
            },

            /**
             * Returns the data saved for the xmodule. Note that this *does not* work for XBlocks.
             */
            getXModuleData: function() {
                var xblock = this.xblock,
                    metadataEditor = this.getMetadataEditor(),
                    data = null;
                if (xblock.save) {
                    data = xblock.save();
                    if (metadataEditor) {
                        data.metadata = _.extend(data.metadata || {}, this.getChangedMetadata());
                    }
                } else {
                    console.error('Cannot save xblock as it has no save method');
                }
                return data;
            },

            /**
             * Returns the metadata that has changed in the editor. This is a combination of the metadata
             * modified in the "Settings" editor, as well as any custom metadata provided by the component.
             */
            getChangedMetadata: function() {
                var metadataEditor = this.getMetadataEditor();
                return _.extend(metadataEditor.getModifiedMetadataValues(), this.getCustomMetadata());
            },

            /**
             * Returns custom metadata defined by a particular xmodule that aren't part of the metadata editor.
             * In particular, this is used for LaTeX high level source.
             */
            getCustomMetadata: function() {
                // Walk through the set of elements which have the 'data-metadata_name' attribute and
                // build up an object to pass back to the server on the subsequent POST.
                // Note that these values will always be sent back on POST, even if they did not actually change.
                var metadata, metadataNameElements, i, element, metadataName;
                metadata = {};
                metadataNameElements = this.$('[data-metadata-name]');
                for (i = 0; i < metadataNameElements.length; i++) {
                    element = metadataNameElements[i];
                    metadataName = $(element).data("metadata-name");
                    metadata[metadataName] = element.value;
                }
                return metadata;
            },

            getMode: function() {
                return this.mode;
            },

            selectMode: function(mode) {
                var showEditor = mode === 'editor',
                    dataEditor = this.getDataEditor(),
                    metadataEditor = this.getMetadataEditor();
                if (dataEditor || metadataEditor) {
                    if (dataEditor) {
                        this.setTabViewActivation(dataEditor, showEditor);
                    }
                    if (metadataEditor) {
                        this.setTabViewActivation(metadataEditor.$el, !showEditor);
                    }
                } else {
                    this.$('.component-tab').removeClass('is-active');
                    this.$('.component-tab').addClass('is-inactive is-hidden');
                    this.setTabViewActivation(this.$('.tab-view-' + mode), true);
                }
                this.mode = mode;
            },

            setTabViewActivation: function(editor, isActive) {
                editor.removeClass('is-active is-inactive is-hidden');
                editor.addClass(isActive ? 'is-active' : 'is-inactive');
                if (!isActive) {
                    editor.addClass('is-hidden');
                }
            }
        });

        return XBlockEditorView;
    }); // end define();
