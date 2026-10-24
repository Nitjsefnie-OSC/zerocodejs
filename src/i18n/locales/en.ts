export default {
  common: {
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    reorder: 'Reorder',
    preview: 'Preview',
    settings: 'Settings',
    manage: 'Manage',
    view: 'View',
    confirm: 'Confirm',
    clear: 'Clear',
    select: 'Select',
    toggleSettingHelp: 'Show or hide a detailed description for this setting',
    replace: 'Replace',
    copy: 'Copy',
    copied: 'Copied'
  },
  toolbar: {
    modeLabel: 'MODE',
    editMode: 'Edit',
    addMode: 'Add',
    reorderMode: 'Reorder',
    deleteMode: 'Delete',
    viewMode: 'View',
    settings: 'Settings'
  },
  settings: {
    title: 'Settings',
    language: {
      label: 'Language',
      ja: 'Japanese',
      en: 'English'
    },
    enableDynamicContent: 'Enable page interactions',
    enableDynamicContentDescription:
      'Enables interactions for dynamic content such as accordions, tabs, modals, and links.',
    devRightPadding: 'Add padding for edit panel',
    devRightPaddingDescription: 'Adds right padding to content when the edit panel is displayed.',
    enableContextMenu: 'Enable right-click menu',
    enableContextMenuDescription:
      'Right-clicking on content displays a menu to switch between edit, add, reorder, and delete modes.',
    scrollIntoViewOnPartEdit: 'Scroll preview to selected part',
    scrollIntoViewOnPartEditDescription:
      'Scrolls the preview to the selected part in edit, add, reorder, or delete mode. On by default.',
    showPartDiscoveryOutlines: 'Show part outlines when none selected',
    showPartDiscoveryOutlinesDescription:
      'In edit, add, reorder, or delete mode, shows a light dashed outline on parts in the preview until you select one. Outlines pulse for about 2 seconds right after you switch modes. Turn off to show outlines on hover only.',
    showSaveConfirm: 'Show save confirmation dialog',
    showSaveConfirmDescription:
      'Displays a dialog to confirm save targets when clicking the save button.',
    previewModeInfo:
      'Dynamic content (accordions, tabs, modals, links, etc.) is always enabled in preview mode.',
    noSettings: 'No settings available.',
    resetToolbarSettings: 'Reset these settings to defaults',
    resetToolbarSettingsConfirm:
      'Reset toolbar settings to their defaults. Language and panel options will not change. Continue?'
  },
  emptyState: {
    message: 'Please add a part',
    addPart: '+ Add Part'
  },
  addPanel: {
    title: 'Add panel',
    selectParent: 'Select parent element',
    category: {
      common: 'Common',
      individual: 'Individual',
      selected: 'Selected part'
    },
    typeAll: 'all',
    activeParts: 'active parts',
    activePartsDescription:
      'You can add the part clicked in the preview area with its current data included.',
    clickPartInPreview: 'Please click a part in the preview area',
    noPartsAvailable: 'No parts available',
    addBefore: 'Add before',
    addAfter: 'Add after',
    showInsertMarkers: 'Show + buttons on preview',
    continueAdding: 'Continue adding parts',
    insertBefore: 'Insert before the selected element',
    editAfterAdd: 'Switch to edit after adding',
    duplicateSelectedHint: 'Click to duplicate and add (see tab row gear icon for options)',
    duplicateSelectedAria: 'Duplicate selected part and add',
    optionsAriaLabel: 'Open add options',
    optionsPopoverTitle: 'Add options',
    resetOptions: 'Reset this panel’s options to defaults'
  },
  editPanel: {
    title: 'Edit panel',
    editing: 'Editing: {type}',
    id: 'ID: {id}',
    selectImage: 'Select image',
    replaceImage: 'Replace',
    clearImage: 'Clear',
    clearImageTitle: 'Clear image',
    noFields: 'No editable fields available'
  },
  richText: {
    toolbar: 'Formatting',
    bold: 'Bold',
    italic: 'Italic',
    strike: 'Strikethrough',
    underline: 'Underline',
    superscript: 'Superscript',
    subscript: 'Subscript',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    heading4: 'Heading 4',
    blockquote: 'Quote',
    horizontalRule: 'Horizontal line',
    link: 'Link',
    clearFormat: 'Remove text formatting',
    undo: 'Undo',
    redo: 'Redo',
    placeholder: 'Enter text...',
    linkUrl: 'Link URL',
    linkNewTab: 'Open in new tab',
    linkApply: 'Apply',
    linkRemove: 'Remove link',
    linkInvalid: 'This URL cannot be used',
    linkTarget: 'Link destination',
    linkSelectPlaceholder: 'Select a destination',
    linkCustom: 'Enter a URL',
    linkSelectRequired: 'Select a link destination',
    unsupportedBrowser:
      'Formatting is not supported in this browser. You can still enter text. Use an up-to-date browser to apply formatting.'
  },
  deletePanel: {
    title: 'Delete panel',
    confirmMessage: 'Do you want to delete this part?',
    selectParent: 'Select parent element',
    continueDeleteAfter: 'Select next part after delete',
    optionsAriaLabel: 'Open delete options',
    optionsPopoverTitle: 'Delete options',
    resetOptions: 'Reset this panel’s options to defaults'
  },
  reorderPanel: {
    title: 'Reorder panel',
    panelHelp:
      'Click a row to scroll the preview. Use the ↕ button to pick source then destination, or drag a row. On the page, click source then destination to reorder.',
    pageGroup: 'Page level',
    emptyGroup: 'No reorderable parts at this level',
    slotGroup: 'Slot: {name}',
    dragHandleAria: 'Reorder {label}',
    reorderPartButton: 'Reorder',
    reorderPartButtonAria: 'Reorder {label}',
    pageClickSourceAria: 'Move source selected: {label}',
    emptyPage: 'No parts to reorder',
    reorderFailed: 'Reorder failed. Select elements at the same level.',
    selectParent: 'Select parent element',
    previewDragAlert:
      'Parts cannot be dragged here. Click source then destination—or drag a row in the reorder panel.',
    optionsAriaLabel: 'Reorder options',
    optionsPopoverTitle: 'Reorder options',
    resetOptions: 'Reset this panel’s options to defaults',
    showStructureLabels: 'Show labels on parts'
  },
  saveConfirm: {
    title: 'Save confirmation',
    message: 'Do you want to save the following data?',
    simpleMessage: 'Do you want to save?',
    targets: {
      page: 'Page data',
      'parts-common': 'Parts (Common)',
      'parts-individual': 'Parts (Individual)',
      'parts-special': 'Parts (Dedicated)',
      'images-common': 'Images (Common)',
      'images-individual': 'Images (Individual)',
      'images-special': 'Images (Dedicated)',
      'parts-common-css': 'CSS (Common)',
      'parts-individual-css': 'CSS (Individual)',
      'parts-special-css': 'CSS (Dedicated)'
    },
    saveButton: 'Save'
  },
  partsManager: {
    createType: 'Create new type',
    editType: 'Edit type',
    typeName: 'Type name',
    typeDescription: 'Description',
    typeNamePlaceholder: 'Example: hero, features',
    typeDescriptionPlaceholder: 'Type description',
    editPart: 'Edit part: {title}',
    partTitle: 'Title',
    partDescription: 'Description',
    partDescriptionPlaceholder: 'Part description',
    options: 'Options',
    outlinePosition: 'Outline position',
    outlinePositionOuter: 'Outer',
    outlinePositionInner: 'Inner',
    slotOnly: 'Slot-only part',
    slotOnlyDescription: 'Hidden from the main add list; add only via a parent slot.',
    deletePartConfirm:
      'Do you want to delete part {number}?\n(Other parts in the type will remain)',
    discardPartChangesConfirm: 'You have unsaved changes. Discard them?',
    deleteTypeConfirm: 'Do you want to delete this type?',
    deleteTypeWithUsagesConfirm:
      'Type "{type}" is used in {count} places. Do you want to delete it?',
    deleteSlotConfirm: 'Do you want to delete slot "{slotName}"?',
    selectImage: 'Select image',
    addPart: 'Add part',
    editTypeButton: 'Edit type',
    reorderType: 'Reorder type',
    deleteTypeButton: 'Delete this type (all parts included)',
    editPartButton: 'Edit part',
    reorderPart: 'Reorder',
    deletePartButton: 'Delete',
    source: 'Source',
    noDescription: 'No description',
    partNumber: 'Part {current} / {total}',
    allowedParts: 'Allowed parts',
    searchParts: 'Search parts...',
    addSlot: 'Add slot',
    selectSlot: 'Select slot...',
    defaultSlot: 'Default slot',
    codeEdit: 'Code editor',
    cssEditInfo: 'About CSS editing',
    preview: 'Preview:',
    cssEditWarning: 'About CSS editing',
    cssEditWarningMessageCommon:
      'CSS edited here is intended to apply to all pages. If existing CSS files (e.g., common.css) exist, they may be overwritten.',
    cssEditWarningMessageIndividual:
      'CSS edited here is intended to apply per page type. If existing CSS files (e.g., page.css) exist, they may be overwritten.',
    cssEditWarningMessageSpecial:
      'CSS edited here is intended to apply per dynamic page. If existing CSS files (e.g., shop111.css) exist, they may be overwritten.',
    dontShowAgain: "Don't show again",
    templateHelp: {
      textField: 'Text field',
      richText: 'Rich text',
      textarea: 'Multi-line text',
      image: 'Image selection',
      radio: 'Radio button',
      checkbox: 'Checkbox',
      selectSingle: 'Select box (single)',
      selectMultiple: 'Select box (multiple)',
      conditional: 'Conditional (show/hide)',
      tag: 'Tag selection',
      slot: 'Slot (child insertion)',
      note: 'Note',
      fieldNameNote: 'Field names can use alphanumeric characters and underscores',
      defaultValueNote: 'Default values are optional (will be empty string if omitted)'
    },
    validationError: 'Error:',
    dangerousTagWarning: '<{tag}> tag is included.',
    dangerousAttrWarning: '{attr} attribute is included.',
    slotSettings: 'Slot settings',
    slot: 'Slot',
    templateHelpTitle: 'Template Syntax Help',
    clickToEnlarge: 'Click to enlarge',
    displayPreview: 'Display preview',
    editPanelPreview: 'Edit panel preview',
    editPanelPreviewNoFields: 'No editable fields',
    editPanelPreviewDesc: 'List of fields shown in the edit panel when editing a page.',
    imageIdReference: 'Image ID reference',
    imageIdReferenceDesc: 'Specify the image ID for the default value in {$field:default:image}.',
    insert: 'Insert',
    noImagesRegistered: 'No images registered. Add images in Image Manager.',
    understood: 'Understood',
    syntax: 'Syntax',
    description: 'Description',
    example: 'Example',
    templateHelpButton: 'Template syntax help'
  },
  imagesManager: {
    addImage: 'Add image',
    editImage: 'Edit image',
    imageId: 'Image ID',
    imageName: 'Image name',
    altText: 'Alt attribute',
    deleteImageConfirm: 'Do you want to delete this image?',
    deleteImageWithUsagesConfirm: 'This image is used in {count} places. Do you want to delete it?',
    addImageFailed: 'Failed to add image',
    replaceImage: 'Replace',
    selectImage: 'Select image',
    currentlySelected: 'Currently selected',
    select: 'Select',
    tabAll: 'All',
    addSpecialImage: 'Add dedicated image',
    uploading: 'Uploading…',
    uploadFailed: 'Failed to upload the image',
    fileTypeNotAllowed: 'This file type cannot be added ({accept})',
    fileTooLarge: 'The file is too large (up to {max})',
    chooseFromMedia: 'Choose from media',
    mediaLoading: 'Loading…',
    mediaLoadFailed: 'Could not load the media list',
    mediaEmpty: 'No images in the media library',
    mediaAdded: 'Added'
  },
  dataViewer: {
    page: 'Page',
    parts: 'Parts',
    images: 'Images',
    common: 'Common',
    individual: 'Individual',
    special: 'Dedicated',
    json: 'JSON',
    html: 'HTML',
    categoryInfo: {
      title: 'About Category Roles',
      common: {
        title: 'Common',
        description:
          'Intended for parts and images shared across the entire site. Assumed to be usable on all pages.'
      },
      individual: {
        title: 'Individual',
        description:
          'Intended for parts and images shared per page type. Assumed to be usable on all pages of the same page type.'
      },
      special: {
        title: 'Dedicated',
        description:
          'Intended for parts and images dedicated to a page or use case. When page-id is set on the CMS, dedicated images can be scoped to all pages or the current page only.'
      }
    }
  },
  contextMenu: {
    edit: 'Edit',
    add: 'Add',
    reorder: 'Reorder',
    delete: 'Delete',
    close: 'Close'
  },
  editor: {
    pageManagement: 'Page Management',
    partsManagement: 'Parts Management',
    imagesManagement: 'Images Management',
    dataViewer: 'Data Viewer',
    loading: 'Loading data...',
    saveFailed: 'Save failed',
    saveFailedWithCount: 'Save failed ({count} items)',
    saveFailedWithMessage: 'Save failed ({count} items): {message}',
    noSaveTargets: 'No save targets'
  }
};
