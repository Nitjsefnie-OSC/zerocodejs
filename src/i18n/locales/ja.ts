export default {
  common: {
    close: '閉じる',
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    add: '追加',
    reorder: '並べ替え',
    preview: 'プレビュー',
    settings: '設定',
    manage: '管理',
    view: '表示',
    confirm: '確定',
    clear: 'クリア',
    select: '選択',
    toggleSettingHelp: 'この設定の詳細説明を表示または非表示にします',
    replace: '差し替え',
    copy: 'コピー',
    copied: 'コピーしました'
  },
  toolbar: {
    modeLabel: 'モード',
    editMode: '編集',
    addMode: '追加',
    reorderMode: '並べ替え',
    deleteMode: '削除',
    viewMode: '表示',
    settings: '設定'
  },
  settings: {
    title: '設定',
    language: {
      label: '言語',
      ja: '日本語',
      en: 'English'
    },
    enableDynamicContent: 'ページの動作を有効にする',
    enableDynamicContentDescription:
      'アコーディオン、タブ、モーダル、リンクなどの動的コンテンツの動作を有効にします。',
    devRightPadding: '編集パネル分の余白をつける',
    devRightPaddingDescription: '編集パネル表示時にコンテンツの右側に余白を追加します。',
    enableContextMenu: '右クリックメニューを有効にする',
    enableContextMenuDescription:
      'コンテンツ上で右クリックすると、編集・追加・並べ替え・削除のモードを切り替えるメニューが表示されます。',
    scrollIntoViewOnPartEdit: 'パーツ選択時に該当箇所へスクロールする',
    scrollIntoViewOnPartEditDescription:
      '編集・追加・並べ替え・削除の各モードでパーツを選んだときなど、プレビューが該当箇所へスクロールします。初期はオンです。',
    showPartDiscoveryOutlines: '未選択時にパーツの枠を表示する',
    showPartDiscoveryOutlinesDescription:
      '編集・追加・並べ替え・削除モードで、まだパーツを選んでいないときにプレビュー上のパーツへ薄い点線を表示します。モードを切り替えた直後は約2秒だけ枠が点滅します。オフにすると、これまでどおりマウスを乗せたときだけ枠が表示されます。',
    showSaveConfirm: '保存時の確認ダイアログを表示する',
    showSaveConfirmDescription:
      '保存ボタンをクリックした際に、保存対象を確認するダイアログを表示します。',
    previewModeInfo:
      '表示モードでは動的コンテンツ（アコーディオン、タブ、モーダル、リンクなど）は常に有効です。',
    noSettings: '設定項目はありません。',
    resetToolbarSettings: 'この設定を初期値に戻す',
    resetToolbarSettingsConfirm:
      'ツールバーの設定を初期値に戻します。言語設定と各パネルのオプションは変更されません。よろしいですか？'
  },
  emptyState: {
    message: 'パーツを追加してください',
    addPart: '+ パーツを追加'
  },
  addPanel: {
    title: '追加パネル',
    selectParent: '親要素を選択',
    category: {
      common: '共通',
      individual: '個別',
      selected: '選択したパーツ'
    },
    typeAll: 'all',
    activeParts: 'active parts',
    activePartsDescription:
      'プレビューエリアでクリックしたパーツを、現在のデータを含む状態で追加できます。',
    clickPartInPreview: 'プレビューエリアでパーツをクリックしてください',
    noPartsAvailable: '利用可能なパーツがありません',
    addBefore: '前に追加',
    addAfter: '後に追加',
    showInsertMarkers: 'プレビューに＋ボタンを表示',
    continueAdding: 'パーツ追加を続ける',
    insertBefore: '選択した要素の前に追加する',
    editAfterAdd: '追加後に編集に移動',
    duplicateSelectedHint: 'クリックして複製で追加（詳細はタブ右の設定アイコン）',
    duplicateSelectedAria: '選択中のパーツを複製して追加',
    optionsAriaLabel: '追加のオプションを開く',
    optionsPopoverTitle: '追加のオプション',
    resetOptions: 'このパネルのオプションを初期値に戻す'
  },
  editPanel: {
    title: '編集パネル',
    editing: '編集中: {type}',
    id: 'ID: {id}',
    selectImage: '画像を選択',
    replaceImage: '差し替え',
    clearImage: 'クリア',
    clearImageTitle: '画像をクリア',
    noFields: '編集可能なフィールドがありません'
  },
  richText: {
    toolbar: '書式',
    bold: '太字',
    italic: '斜体',
    strike: '取り消し線',
    underline: '下線',
    superscript: '上付き',
    subscript: '下付き',
    bulletList: '箇条書き',
    orderedList: '番号付きリスト',
    heading2: '見出し2',
    heading3: '見出し3',
    heading4: '見出し4',
    blockquote: '引用',
    horizontalRule: '水平線',
    link: 'リンク',
    clearFormat: '書式をクリア',
    undo: '元に戻す',
    redo: 'やり直す',
    placeholder: 'テキストを入力...',
    linkUrl: 'リンク先 URL',
    linkNewTab: '新しいタブで開く',
    linkApply: '適用',
    linkRemove: 'リンクを解除',
    linkInvalid: 'この URL は使用できません'
  },
  deletePanel: {
    title: '削除パネル',
    confirmMessage: 'このパーツを削除しますか？',
    selectParent: '親要素を選択',
    continueDeleteAfter: '削除後に次のパーツを選ぶ',
    optionsAriaLabel: '削除のオプションを開く',
    optionsPopoverTitle: '削除のオプション',
    resetOptions: 'このパネルのオプションを初期値に戻す'
  },
  reorderPanel: {
    title: '並べ替えパネル',
    panelHelp:
      '行クリックでプレビューへ移動。↕ ボタンで移動元→移動先を選んで並べ替え。行ドラッグでも並べ替えできます。ページ上でも移動元→移動先の順にクリックできます。',
    pageGroup: 'ページ直下',
    emptyGroup: 'この階層に並べ替え可能なパーツがありません',
    slotGroup: 'スロット: {name}',
    dragHandleAria: '{label} の並べ替え',
    reorderPartButton: '並べ替え',
    reorderPartButtonAria: '{label} を並べ替え',
    pageClickSourceAria: '選択中の移動元: {label}',
    emptyPage: '並べ替えるパーツがありません',
    reorderFailed: '並べ替えに失敗しました。同じ階層の要素を選択してください。',
    selectParent: '親要素を選択',
    previewDragAlert:
      'パーツをドラッグすることはできません。移動元と移動先を順にクリックするか、並べ替えパネルで行をドラッグしてください。',
    optionsAriaLabel: '並べ替えオプション',
    optionsPopoverTitle: '並べ替えオプション',
    resetOptions: 'このパネルのオプションを初期値に戻す',
    showStructureLabels: 'パーツにラベルを表示する'
  },
  saveConfirm: {
    title: '保存の確認',
    message: '以下のデータを保存しますか？',
    simpleMessage: '保存しますか？',
    targets: {
      page: 'ページデータ',
      'parts-common': 'パーツ（共通）',
      'parts-individual': 'パーツ（個別）',
      'parts-special': 'パーツ（専用）',
      'parts-common-css': 'CSS（共通）',
      'parts-individual-css': 'CSS（個別）',
      'parts-special-css': 'CSS（専用）',
      'images-common': '画像（共通）',
      'images-individual': '画像（個別）',
      'images-special': '画像（専用）'
    },
    saveButton: '保存する'
  },
  partsManager: {
    createType: 'タイプ追加',
    editType: 'タイプ編集',
    typeName: 'タイプ名',
    typeDescription: '説明',
    typeNamePlaceholder: '例: hero, features',
    typeDescriptionPlaceholder: 'タイプの説明',
    editPart: 'パーツ編集: {title}',
    partTitle: 'タイトル',
    partDescription: '説明',
    partDescriptionPlaceholder: 'パーツの説明',
    options: 'オプション',
    outlinePosition: 'アウトラインの位置',
    outlinePositionOuter: '外側',
    outlinePositionInner: '内側',
    slotOnly: 'スロット専用パーツ',
    slotOnlyDescription: '通常の追加一覧には出ず、スロットからのみ追加できます。',
    deletePartConfirm: 'パーツ {number} を削除しますか？\n（タイプには他のパーツが残ります）',
    discardPartChangesConfirm: '編集内容が保存されていません。破棄しますか？',
    deleteTypeConfirm: 'このタイプを削除しますか？',
    deleteTypeWithUsagesConfirm: 'タイプ「{type}」は{count}箇所で使用されています。削除しますか？',
    deleteSlotConfirm: 'スロット「{slotName}」を削除しますか？',
    selectImage: '画像選択',
    addPart: 'パーツを追加',
    editTypeButton: 'タイプ全体を編集',
    reorderType: 'タイプを並べ替え',
    deleteTypeButton: 'このタイプを削除（全パーツ含む）',
    editPartButton: 'パーツを編集',
    reorderPart: '並べ替え',
    deletePartButton: '削除',
    source: '移動元',
    noDescription: '説明なし',
    partNumber: 'パーツ {current} / {total}',
    allowedParts: '許可されるパーツ',
    searchParts: 'パーツを検索...',
    addSlot: 'スロットを追加',
    selectSlot: 'スロットを選択...',
    defaultSlot: 'デフォルトスロット',
    codeEdit: 'コード編集',
    cssEditInfo: 'CSS編集について',
    templateSuggestions: '予測変換',
    preview: 'プレビュー:',
    cssEditWarning: 'CSS編集について',
    cssEditWarningMessageCommon:
      'ここで編集したCSSは、すべてのページに適用される想定です。既存のCSSファイル（common.cssなど）がある場合、それらを上書きする可能性があります。',
    cssEditWarningMessageIndividual:
      'ここで編集したCSSは、ページタイプごとに適用される想定です。既存のCSSファイル（page.cssなど）がある場合、それらを上書きする可能性があります。',
    cssEditWarningMessageSpecial:
      'ここで編集したCSSは、動的ページごとに適用される想定です。既存のCSSファイル（shop111.cssなど）がある場合、それらを上書きする可能性があります。',
    understood: '了解しました',
    dontShowAgain: '次回から表示しない',
    templateHelp: {
      textField: 'テキストフィールド',
      richText: 'リッチテキスト',
      textarea: '複数行テキスト',
      image: '画像選択',
      radio: 'ラジオボタン',
      checkbox: 'チェックボックス',
      selectSingle: 'セレクトボックス（単一選択）',
      selectMultiple: 'セレクトボックス（複数選択）',
      conditional: '条件分岐（表示/非表示）',
      tag: 'タグ選択',
      slot: 'スロット（子要素挿入）',
      note: '補足',
      suggestionNote:
        '予測変換を有効にすると、<code>$</code>、<code>(</code>、<code>z</code>を入力時に自動補完が表示されます',
      fieldNameNote: 'フィールド名は英数字とアンダースコアが使用できます',
      defaultValueNote: 'デフォルト値は省略可能です（空文字になります）'
    },
    validationError: 'エラー:',
    dangerousTagWarning: '<{tag}> タグが含まれています。',
    dangerousAttrWarning: '{attr} 属性が含まれています。',
    slotSettings: 'スロット設定',
    slot: 'スロット',
    templateHelpTitle: 'テンプレート記法ヘルプ',
    syntax: '記法',
    description: '説明',
    example: '例',
    templateHelpButton: 'テンプレート記法のヘルプ',
    clickToEnlarge: 'クリックで拡大',
    displayPreview: '表示プレビュー',
    editPanelPreview: '編集パネルプレビュー',
    editPanelPreviewNoFields: '編集可能なフィールドはありません',
    editPanelPreviewDesc: 'ページ編集時に表示される編集パネルの項目一覧です。',
    imageIdReference: '画像ID参照',
    imageIdReferenceDesc:
      "テンプレートの '{'$field:default:image'}' の default には画像IDを指定します。",
    insert: '挿入',
    noImagesRegistered: '画像が登録されていません。画像管理で追加してください。'
  },
  imagesManager: {
    addImage: '画像追加',
    editImage: '画像編集',
    imageId: '画像ID',
    imageName: '画像名',
    altText: 'Alt属性',
    deleteImageConfirm: 'この画像を削除しますか？',
    deleteImageWithUsagesConfirm: 'この画像は{count}箇所で使用されています。削除しますか？',
    addImageFailed: '画像の追加に失敗しました',
    replaceImage: '差し替え',
    selectImage: '画像を選択',
    currentlySelected: '現在選択中',
    select: '選択',
    tabAll: '全て',
    addSpecialImage: '専用画像を追加'
  },
  dataViewer: {
    page: 'ページ',
    parts: 'パーツ',
    images: '画像',
    common: '共通',
    individual: '個別',
    special: '専用',
    json: 'JSON',
    html: 'HTML',
    categoryInfo: {
      title: 'カテゴリの役割について',
      common: {
        title: '共通',
        description:
          'サイト全体で共有されるパーツ・画像を想定しています。すべてのページで使用できる想定です。'
      },
      individual: {
        title: '個別',
        description:
          'ページタイプごとに共有されるパーツ・画像を想定しています。同じページタイプのすべてのページで使用できる想定です。'
      },
      special: {
        title: '専用',
        description:
          'ページや用途に専用のパーツ・画像を想定しています。page-id を指定した CMS では、専用画像を「全ページ」と「このページ」に分けて管理できます。'
      }
    }
  },
  contextMenu: {
    edit: '編集',
    add: '追加',
    reorder: '並べ替え',
    delete: '削除',
    close: '閉じる'
  },
  editor: {
    pageManagement: 'ページ管理',
    partsManagement: 'パーツ管理',
    imagesManagement: '画像管理',
    dataViewer: 'データビューアー',
    loading: 'データを読み込み中...',
    saveFailed: '保存に失敗しました',
    saveFailedWithCount: '保存に失敗しました（{count}件）',
    saveFailedWithMessage: '保存に失敗しました（{count}件）: {message}',
    noSaveTargets: '保存対象がありません'
  }
};
