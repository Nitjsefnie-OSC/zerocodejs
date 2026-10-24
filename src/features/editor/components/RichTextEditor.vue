<template>
  <div class="zcode-rich-text-editor">
    <div
      v-if="toolbarGroups.length"
      class="zcode-rich-text-toolbar"
      role="toolbar"
      :aria-label="label ? `${label} - ${t('richText.toolbar')}` : t('richText.toolbar')"
      @keydown="handleToolbarKeydown"
    >
      <template v-for="(group, groupIndex) in toolbarGroups" :key="groupIndex">
        <div v-if="groupIndex > 0" class="zcode-toolbar-divider" aria-hidden="true" />
        <button
          v-for="item in group"
          :key="item.id"
          ref="toolbarButtonRefs"
          type="button"
          class="zcode-toolbar-btn"
          :class="{ 'is-active': item.active }"
          :data-index="item.index"
          :title="item.shortcut ? `${item.label} (${item.shortcut})` : item.label"
          :aria-label="item.label"
          :aria-keyshortcuts="item.ariaShortcut"
          :aria-pressed="item.toggle ? !!item.active : undefined"
          :aria-expanded="item.controls ? linkForm.open : undefined"
          :aria-controls="item.controls && linkForm.open ? item.controls : undefined"
          :disabled="item.disabled || !editable"
          :tabindex="item.index === tabStopIndex ? 0 : -1"
          @mousedown.prevent
          @focus="rovingIndex = item.index ?? 0"
          @click="item.run"
        >
          <component :is="item.icon" :size="16" aria-hidden="true" />
        </button>
      </template>
    </div>

    <div
      v-if="linkForm.open"
      :id="linkFormId"
      class="zcode-rich-text-link-form"
      role="group"
      :aria-label="t('richText.link')"
      @keydown.esc.prevent.stop="closeLinkForm(true)"
    >
      <select
        v-if="config.linkMode !== 'free'"
        ref="linkSelectRef"
        v-model="linkForm.choice"
        class="zcode-rich-text-link-select"
        :aria-label="t('richText.linkTarget')"
        :aria-invalid="linkForm.error && !isCustomLink ? 'true' : undefined"
        :aria-describedby="linkForm.error ? `${linkFormId}-error` : undefined"
        @keydown.enter.prevent="applyLink"
      >
        <option value="" disabled>{{ t('richText.linkSelectPlaceholder') }}</option>
        <option v-for="(option, index) in linkOptions ?? []" :key="index" :value="String(index)">
          {{ option.label }}
        </option>
        <option v-if="config.linkMode === 'both'" :value="CUSTOM_LINK">
          {{ t('richText.linkCustom') }}
        </option>
      </select>
      <template v-if="isCustomLink">
        <input
          ref="linkInputRef"
          v-model="linkForm.href"
          type="url"
          class="zcode-rich-text-link-input"
          placeholder="https://"
          :aria-label="t('richText.linkUrl')"
          :aria-invalid="linkForm.error ? 'true' : undefined"
          :aria-describedby="linkForm.error ? `${linkFormId}-error` : undefined"
          @keydown.enter.prevent="applyLink"
        />
        <label class="zcode-rich-text-link-newtab">
          <input v-model="linkForm.newTab" type="checkbox" />
          {{ t('richText.linkNewTab') }}
        </label>
      </template>
      <div class="zcode-rich-text-link-actions">
        <button type="button" class="zcode-rich-text-link-btn is-primary" @click="applyLink">
          {{ t('richText.linkApply') }}
        </button>
        <button
          v-if="linkForm.existing"
          type="button"
          class="zcode-rich-text-link-btn"
          @click="unlink"
        >
          {{ t('richText.linkRemove') }}
        </button>
        <button type="button" class="zcode-rich-text-link-btn" @click="closeLinkForm(true)">
          {{ t('common.cancel') }}
        </button>
      </div>
      <div
        v-if="linkForm.error"
        :id="`${linkFormId}-error`"
        class="zcode-field-error-message"
        role="alert"
      >
        {{ linkForm.error }}
      </div>
    </div>

    <div
      ref="contentRef"
      class="zcode-rich-text-editor-content"
      :class="{ 'is-empty': isEmpty }"
      :contenteditable="editable ? 'true' : 'false'"
      role="textbox"
      aria-multiline="true"
      :aria-readonly="readonly ? 'true' : undefined"
      :aria-disabled="disabled ? 'true' : undefined"
      :tabindex="disabled ? -1 : 0"
      :aria-label="label || placeholderText"
      :data-placeholder="placeholderText"
      @beforeinput="handleBeforeInput"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
      @compositionstart="composing = true"
      @compositionend="handleCompositionEnd"
      @focus="handleFocus"
    />
  </div>
</template>

<script lang="ts">
let instanceCount = 0;
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { Component } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  List,
  ListOrdered,
  Minus,
  Link,
  RemoveFormatting,
  Undo2,
  Redo2
} from 'lucide-vue-next';
import { zcodeRichTextConfigKey } from '../../../core/injectionKeys';
import { sanitizeUrl } from '../../../core/utils/sanitize';
import { getBackendDataValue } from '../../../core/utils/template-utils';
import {
  resolveLinkOptions,
  resolveRichTextConfig,
  type RichTextLinkPolicy,
  type ListTag,
  type MarkTag,
  type RichTextFeature,
  type TextBlockTag
} from '../rich-text/features';
import {
  ZWSP,
  cleanupPlaceholders,
  clearMarks,
  currentBlockTag,
  ensureBlocks,
  getLinkAt,
  insertHorizontalRule,
  isList,
  isMarkActive,
  removeLink,
  setBlockType,
  setLink,
  tidyMarks,
  toggleList,
  toggleMark,
  unitsInRange,
  type SelectionPoints
} from '../rich-text/dom';
import { toEditorHtml, toOutputHtml, toPastedHtml } from '../rich-text/normalize';
import { RichTextHistory } from '../rich-text/history';
import {
  deserializeSelection,
  getEditorRange,
  serializeSelection,
  setEditorSelection
} from '../rich-text/selection';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  label?: string;
  readonly?: boolean;
  disabled?: boolean;
  /** リンク候補（config の richText.link.source）を参照する */
  backendData?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const config = inject(zcodeRichTextConfigKey, resolveRichTextConfig(undefined));
const features = config.features;
const has = (feature: RichTextFeature) => features.has(feature);

const CUSTOM_LINK = '__custom__';
const linkOptions = computed(() =>
  config.linkSource
    ? resolveLinkOptions(getBackendDataValue(props.backendData, config.linkSource))
    : null
);
const linkPolicy = computed<RichTextLinkPolicy>(() => ({
  mode: config.linkMode,
  options: linkOptions.value
}));
/** select モードで候補がない（未取得を含む）ときはリンクを付けられない */
const canLink = computed(
  () => has('link') && (config.linkMode !== 'select' || !!linkOptions.value?.length)
);

const contentRef = ref<HTMLElement | null>(null);
const linkInputRef = ref<HTMLInputElement | null>(null);
const linkSelectRef = ref<HTMLSelectElement | null>(null);
const toolbarButtonRefs = ref<HTMLButtonElement[]>([]);
const editable = computed(() => !props.readonly && !props.disabled);
const linkFormId = `zcode-rich-text-link-${++instanceCount}`;

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const modLabel = isMac ? '⌘' : 'Ctrl+';
const modAria = isMac ? 'Meta' : 'Control';
const placeholderText = computed(() => props.placeholder || t('richText.placeholder'));

const composing = ref(false);
const isEmpty = ref(false);
const activeMarks = reactive(new Set<MarkTag>());
const blockTag = ref<string | null>(null);
const linkActive = ref(false);
const canUndo = ref(false);
const canRedo = ref(false);
const linkForm = reactive({
  open: false,
  choice: '',
  href: '',
  newTab: false,
  existing: false,
  error: ''
});
const isCustomLink = computed(() => config.linkMode === 'free' || linkForm.choice === CUSTOM_LINK);

const history = new RichTextHistory();
let lastEmitted: string | null = null;
let recordTimer: ReturnType<typeof setTimeout> | null = null;
let linkRange: Range | null = null;

const RECORD_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// 内容の読み込み・出力・履歴
// ---------------------------------------------------------------------------

function updateEmpty(root: HTMLElement) {
  const text = (root.textContent ?? '').split(ZWSP).join('');
  isEmpty.value =
    text === '' &&
    root.childElementCount <= 1 &&
    root.firstElementChild?.nodeName === 'P' &&
    !root.querySelector('hr');
}

function load(value: string) {
  const root = contentRef.value;
  if (!root) return;
  root.innerHTML = toEditorHtml(value, features, linkPolicy.value);
  lastEmitted = value;
  history.reset(snapshot(root));
  updateEmpty(root);
  refreshState();
}

function emitChange() {
  const root = contentRef.value;
  if (!root) return;
  updateEmpty(root);
  const html = toOutputHtml(root, features, linkPolicy.value);
  if (html === lastEmitted) return;
  lastEmitted = html;
  emit('update:modelValue', html);
}

function snapshot(root: HTMLElement) {
  return { html: root.innerHTML, selection: serializeSelection(root, getEditorRange(root)) };
}

function record() {
  const root = contentRef.value;
  if (!root) return;
  history.record(snapshot(root));
  canUndo.value = history.canUndo;
  canRedo.value = history.canRedo;
}

function scheduleRecord(delay: number) {
  if (recordTimer) clearTimeout(recordTimer);
  recordTimer = setTimeout(() => {
    recordTimer = null;
    if (!composing.value) record();
  }, delay);
}

function flushRecord() {
  if (!recordTimer) return;
  clearTimeout(recordTimer);
  recordTimer = null;
  record();
}

function restore(entry: { html: string; selection: Parameters<typeof deserializeSelection>[1] }) {
  const root = contentRef.value;
  if (!root) return;
  root.innerHTML = entry.html;
  root.focus({ preventScroll: true });
  const points = deserializeSelection(root, entry.selection);
  if (points) setEditorSelection(root, points);
  canUndo.value = history.canUndo;
  canRedo.value = history.canRedo;
  emitChange();
  refreshState();
}

function undo() {
  if (composing.value) return;
  flushRecord();
  const entry = history.undo();
  if (entry) restore(entry);
}

function redo() {
  if (composing.value) return;
  flushRecord();
  const entry = history.redo();
  if (entry) restore(entry);
}

// ---------------------------------------------------------------------------
// 編集操作
// ---------------------------------------------------------------------------

function isUsableRange(root: HTMLElement, range: Range | null): range is Range {
  return (
    !!range &&
    (range.startContainer === root || root.contains(range.startContainer)) &&
    (range.endContainer === root || root.contains(range.endContainer))
  );
}

/** 選択範囲がない場合（Tab でツールバーに来た直後など）は本文末尾にキャレットを置く */
function rangeOrCaretAtEnd(root: HTMLElement): Range | null {
  const range = getEditorRange(root);
  if (range) return range;
  root.focus({ preventScroll: true });
  let target: Node = root.lastElementChild ?? root;
  if (isList(target) && target.lastElementChild) target = target.lastElementChild;
  let offset = target.childNodes.length;
  if (target.lastChild?.nodeName === 'BR') offset -= 1;
  setEditorSelection(root, {
    startNode: target,
    startOffset: offset,
    endNode: target,
    endOffset: offset
  });
  return getEditorRange(root);
}

function runCommand(
  command: (root: HTMLElement, range: Range) => SelectionPoints | null,
  rangeOverride?: Range | null
) {
  const root = contentRef.value;
  if (!root || composing.value || !editable.value) return;
  flushRecord();
  const range = isUsableRange(root, rangeOverride ?? null)
    ? rangeOverride!
    : rangeOrCaretAtEnd(root);
  if (!range) return;
  const points = command(root, range);
  ensureBlocks(root);
  root.focus({ preventScroll: true });
  if (points) setEditorSelection(root, points);
  record();
  emitChange();
  refreshState();
}

const toggleMarkCommand = (tag: MarkTag) => {
  const exclusive: MarkTag[] = tag === 'sup' ? ['sub'] : tag === 'sub' ? ['sup'] : [];
  runCommand((root, range) => toggleMark(root, range, tag, exclusive));
};
const blockCommand = (tag: TextBlockTag) =>
  runCommand((root, range) => setBlockType(root, range, tag));
const listCommand = (tag: ListTag) => runCommand((root, range) => toggleList(root, range, tag));

function refreshState() {
  const root = contentRef.value;
  if (!root) return;
  const range = getEditorRange(root);
  if (!range) return;
  activeMarks.clear();
  for (const tag of ['strong', 'em', 's', 'u', 'sup', 'sub'] as MarkTag[]) {
    if (isMarkActive(root, range, tag)) activeMarks.add(tag);
  }
  blockTag.value = currentBlockTag(root, range);
  linkActive.value = !!getLinkAt(root, range);
}

// ---------------------------------------------------------------------------
// リンク
// ---------------------------------------------------------------------------

function openLinkForm() {
  const root = contentRef.value;
  if (!root || !canLink.value || !editable.value) return;
  const range = rangeOrCaretAtEnd(root);
  if (!range) return;
  flushRecord();
  linkRange = range.cloneRange();
  const existing = getLinkAt(root, range);
  const optionIndex = existing
    ? (linkOptions.value ?? []).findIndex((option) => option.url === existing.href)
    : -1;
  let choice = '';
  if (optionIndex >= 0) choice = String(optionIndex);
  else if (existing && config.linkMode === 'both') choice = CUSTOM_LINK;
  Object.assign(linkForm, {
    open: true,
    choice,
    href: existing && optionIndex < 0 ? existing.href : '',
    newTab: existing?.newTab ?? false,
    existing: !!existing,
    error: ''
  });
  nextTick(() => (config.linkMode === 'free' ? linkInputRef : linkSelectRef).value?.focus());
}

function closeLinkForm(restoreSelection: boolean) {
  linkForm.open = false;
  const root = contentRef.value;
  if (!restoreSelection || !root) return;
  root.focus({ preventScroll: true });
  if (!isUsableRange(root, linkRange)) return;
  setEditorSelection(root, {
    startNode: linkRange.startContainer,
    startOffset: linkRange.startOffset,
    endNode: linkRange.endContainer,
    endOffset: linkRange.endOffset
  });
}

function applyLink() {
  let link: { href: string; newTab: boolean; text?: string };
  if (isCustomLink.value) {
    const href = sanitizeUrl(linkForm.href.trim());
    if (!href) {
      linkForm.error = t('richText.linkInvalid');
      return;
    }
    link = { href, newTab: linkForm.newTab };
  } else {
    const option = linkOptions.value?.[Number(linkForm.choice)];
    if (!linkForm.choice || !option) {
      linkForm.error = t('richText.linkSelectRequired');
      return;
    }
    link = { href: option.url, newTab: !!option.newTab, text: option.label };
  }
  linkForm.open = false;
  runCommand((root, range) => setLink(root, range, link), linkRange);
}

function unlink() {
  linkForm.open = false;
  runCommand((root, range) => removeLink(root, range), linkRange);
}

// ---------------------------------------------------------------------------
// ツールバー
// ---------------------------------------------------------------------------

interface ToolbarItem {
  id: string;
  label: string;
  icon: Component;
  run: () => void;
  toggle?: boolean;
  active?: boolean;
  disabled?: boolean;
  /** 開閉するフォームの id（aria-expanded / aria-controls 用） */
  controls?: string;
  shortcut?: string;
  ariaShortcut?: string;
  index?: number;
}

/** ツールバーに表示するショートカット（修飾キーを除く） */
const SHORTCUT_KEYS: Record<string, string> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strike: 'Shift+X',
  link: 'K',
  undo: 'Z',
  redo: 'Shift+Z'
};

const toolbarGroups = computed<ToolbarItem[][]>(() => {
  const mark = (feature: RichTextFeature, tag: MarkTag, icon: Component): ToolbarItem[] =>
    has(feature)
      ? [
          {
            id: feature,
            label: t(`richText.${feature}`),
            icon,
            toggle: true,
            active: activeMarks.has(tag),
            run: () => toggleMarkCommand(tag)
          }
        ]
      : [];
  const block = (id: string, tag: TextBlockTag, icon: Component): ToolbarItem => ({
    id,
    label: t(`richText.${id}`),
    icon,
    toggle: true,
    active: blockTag.value === tag,
    run: () => blockCommand(tag)
  });
  const list = (feature: RichTextFeature, tag: ListTag, icon: Component): ToolbarItem[] =>
    has(feature)
      ? [
          {
            id: feature,
            label: t(`richText.${feature}`),
            icon,
            toggle: true,
            active: blockTag.value === tag,
            run: () => listCommand(tag)
          }
        ]
      : [];

  const marks = [
    ...mark('bold', 'strong', Bold),
    ...mark('italic', 'em', Italic),
    ...mark('underline', 'u', Underline),
    ...mark('strike', 's', Strikethrough),
    ...mark('superscript', 'sup', Superscript),
    ...mark('subscript', 'sub', Subscript)
  ];
  const blocks: ToolbarItem[] = [
    ...(has('heading')
      ? [
          block('heading2', 'h2', Heading2),
          block('heading3', 'h3', Heading3),
          block('heading4', 'h4', Heading4)
        ]
      : []),
    ...(has('blockquote') ? [block('blockquote', 'blockquote', Quote)] : []),
    ...list('bulletList', 'ul', List),
    ...list('orderedList', 'ol', ListOrdered),
    ...(has('horizontalRule')
      ? [
          {
            id: 'horizontalRule',
            label: t('richText.horizontalRule'),
            icon: Minus,
            run: () => runCommand(insertHorizontalRule)
          }
        ]
      : [])
  ];
  const extras: ToolbarItem[] = [
    ...(canLink.value
      ? [
          {
            id: 'link',
            label: t('richText.link'),
            icon: Link,
            active: linkActive.value,
            controls: linkFormId,
            run: openLinkForm
          }
        ]
      : []),
    ...(has('clearFormat')
      ? [
          {
            id: 'clearFormat',
            label: t('richText.clearFormat'),
            icon: RemoveFormatting,
            run: () => runCommand(clearMarks)
          }
        ]
      : [])
  ];
  const historyItems: ToolbarItem[] = has('history')
    ? [
        { id: 'undo', label: t('richText.undo'), icon: Undo2, disabled: !canUndo.value, run: undo },
        { id: 'redo', label: t('richText.redo'), icon: Redo2, disabled: !canRedo.value, run: redo }
      ]
    : [];
  const groups = [marks, blocks, extras, historyItems].filter((group) => group.length > 0);
  let index = 0;
  for (const item of groups.flat()) {
    item.index = index++;
    const key = SHORTCUT_KEYS[item.id];
    if (key) {
      item.shortcut = `${modLabel}${key}`;
      item.ariaShortcut = `${modAria}+${key}`;
    }
  }
  return groups;
});

// ---------------------------------------------------------------------------
// ツールバーのキーボード操作（ロービング tabindex: Tab で止まるのは1つ、矢印キーで移動）
// ---------------------------------------------------------------------------

const rovingIndex = ref(0);

const enabledIndexes = computed(() =>
  editable.value
    ? toolbarGroups.value
        .flat()
        .filter((item) => !item.disabled)
        .map((item) => item.index as number)
    : []
);

/** 無効になったボタンに Tab で入れなくならないよう、有効なボタンに読み替える */
const tabStopIndex = computed(() => {
  const enabled = enabledIndexes.value;
  return enabled.includes(rovingIndex.value) ? rovingIndex.value : (enabled[0] ?? -1);
});

const NEXT_POSITION: Record<string, (position: number, length: number) => number> = {
  ArrowRight: (position, length) => (position + 1) % length,
  ArrowLeft: (position, length) => (position - 1 + length) % length,
  Home: () => 0,
  End: (_position, length) => length - 1
};

function handleToolbarKeydown(event: KeyboardEvent) {
  const move = NEXT_POSITION[event.key];
  const enabled = enabledIndexes.value;
  if (!move || !enabled.length) return;
  event.preventDefault();
  const position = Math.max(enabled.indexOf(tabStopIndex.value), 0);
  const next = enabled[move(position, enabled.length)];
  rovingIndex.value = next;
  toolbarButtonRefs.value.find((button) => Number(button.dataset.index) === next)?.focus();
}

// ---------------------------------------------------------------------------
// 入力イベント
// ---------------------------------------------------------------------------

const FORMAT_INPUT_TYPES: Record<string, [RichTextFeature, MarkTag]> = {
  formatBold: ['bold', 'strong'],
  formatItalic: ['italic', 'em'],
  formatUnderline: ['underline', 'u'],
  formatStrikeThrough: ['strike', 's'],
  formatSuperscript: ['superscript', 'sup'],
  formatSubscript: ['subscript', 'sub']
};

function handleBeforeInput(event: InputEvent) {
  const type = event.inputType;
  if (type === 'historyUndo' || type === 'historyRedo') {
    event.preventDefault();
    if (type === 'historyUndo') undo();
    else redo();
    return;
  }
  if (type === 'insertFromDrop') {
    // ドロップされた HTML は正規化を経ないため受け付けない
    event.preventDefault();
    return;
  }
  if (type.startsWith('format')) {
    event.preventDefault();
    const mapped = FORMAT_INPUT_TYPES[type];
    if (mapped && has(mapped[0])) toggleMarkCommand(mapped[1]);
  }
}

/** ルート直下に段落外のテキストができた場合（全選択して入力した直後など）に段落で包む */
function ensureBlocksKeepingSelection(root: HTMLElement) {
  const needsFix =
    !root.firstChild ||
    Array.from(root.childNodes).some((n) => !/^(P|H2|H3|H4|BLOCKQUOTE|UL|OL|HR)$/.test(n.nodeName));
  if (!needsFix) return;
  const range = getEditorRange(root);
  const saved = range && {
    startNode: range.startContainer,
    startOffset: range.startOffset,
    endNode: range.endContainer,
    endOffset: range.endOffset
  };
  ensureBlocks(root);
  if (saved && root.contains(saved.startNode) && root.contains(saved.endNode)) {
    setEditorSelection(root, saved);
  }
}

function handleInput(event: Event) {
  const root = contentRef.value;
  if (!root || composing.value || (event as InputEvent).isComposing) return;
  ensureBlocksKeepingSelection(root);
  scheduleRecord(RECORD_DELAY_MS);
  emitChange();
}

function handleCompositionEnd() {
  composing.value = false;
  // compositionend の後に input が届くブラウザがあるため、確定内容の反映を次のタスクに回す
  setTimeout(() => {
    const root = contentRef.value;
    if (!root || composing.value) return;
    ensureBlocksKeepingSelection(root);
    scheduleRecord(0);
    emitChange();
  }, 0);
}

const SHORTCUT_MARKS: Record<string, [RichTextFeature, MarkTag]> = {
  b: ['bold', 'strong'],
  i: ['italic', 'em'],
  u: ['underline', 'u']
};

function exitEmptyListItem(): boolean {
  const root = contentRef.value;
  if (!root) return false;
  const range = getEditorRange(root);
  if (!range || !range.collapsed) return false;
  const [unit] = unitsInRange(root, range);
  if (!unit || unit.nodeName !== 'LI') return false;
  if ((unit.textContent ?? '').split(ZWSP).join('') !== '') return false;
  const listTag = unit.parentElement?.nodeName.toLowerCase() as ListTag;
  listCommand(listTag);
  return true;
}

function handleKeydown(event: KeyboardEvent) {
  // IME 変換中（Safari は keyCode 229）のキー操作は変換に任せる
  if (event.isComposing || event.keyCode === 229) return;

  if (event.key === 'Enter' && !event.shiftKey && exitEmptyListItem()) {
    event.preventDefault();
    return;
  }

  // Mac では Ctrl+B / Ctrl+K などが標準のカーソル操作のため、修飾キーは Cmd のみ
  const mod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!mod || event.altKey) return;
  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if (key === 'y' && !event.shiftKey && !isMac) {
    event.preventDefault();
    redo();
    return;
  }
  if (SHORTCUT_MARKS[key] && !event.shiftKey) {
    event.preventDefault();
    const [feature, tag] = SHORTCUT_MARKS[key];
    if (has(feature)) toggleMarkCommand(tag);
    return;
  }
  if (key === 'x' && event.shiftKey && has('strike')) {
    event.preventDefault();
    toggleMarkCommand('s');
    return;
  }
  if (key === 'k' && canLink.value) {
    event.preventDefault();
    openLinkForm();
  }
}

function insertPastedHtml(root: HTMLElement, range: Range, html: string): SelectionPoints | null {
  const doc = root.ownerDocument;
  const template = doc.createElement('template');
  template.innerHTML = html;
  const blocks = Array.from(template.content.children) as HTMLElement[];
  if (!blocks.length) return null;

  range.deleteContents();
  ensureBlocks(root);

  const [unit] = unitsInRange(root, range);
  const singleParagraph = blocks.length === 1 && blocks[0].nodeName === 'P';
  const insideTextBlock = !!unit && unit.nodeName !== 'LI';

  if (singleParagraph || !insideTextBlock) {
    // 段落の途中・リスト項目内には、ブロックを改行でつないだインライン内容として入れる
    const fragment = doc.createDocumentFragment();
    blocks.forEach((block, index) => {
      if (index > 0) fragment.append(doc.createElement('br'));
      fragment.append(...Array.from(block.childNodes));
    });
    const last = fragment.lastChild;
    if (!last) return null;
    range.insertNode(fragment);
    const parent = last.parentNode as Node;
    const offset = Array.prototype.indexOf.call(parent.childNodes, last) + 1;
    return { startNode: parent, startOffset: offset, endNode: parent, endOffset: offset };
  }

  // 段落をキャレット位置で分割し、間に貼り付けたブロックを入れる
  const tail = doc.createRange();
  tail.setStart(range.startContainer, range.startOffset);
  tail.setEnd(unit, unit.childNodes.length);
  const tailContent = tail.extractContents();
  const after = unit.cloneNode(false) as HTMLElement;
  after.append(tailContent);
  unit.after(...blocks, after);
  if (!(after.textContent ?? '').trim() && !after.querySelector('br, hr')) after.remove();
  if (!(unit.textContent ?? '').trim() && !unit.querySelector('br')) unit.remove();
  tidyMarks(root);
  const lastBlock = blocks[blocks.length - 1];
  return {
    startNode: lastBlock,
    startOffset: lastBlock.childNodes.length,
    endNode: lastBlock,
    endOffset: lastBlock.childNodes.length
  };
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const data = event.clipboardData;
  if (!data) return;
  const html = toPastedHtml(
    { html: data.getData('text/html'), text: data.getData('text/plain') },
    features,
    linkPolicy.value
  );
  if (!html) return;
  runCommand((root, range) => insertPastedHtml(root, range, html));
}

function handleFocus() {
  // 段落の区切りを <p> に揃える（execCommand の設定のみで、編集操作には使わない）
  document.execCommand('defaultParagraphSeparator', false, 'p');
  if (linkForm.open) linkForm.open = false;
}

function handleSelectionChange() {
  const root = contentRef.value;
  if (!root || composing.value) return;
  const range = getEditorRange(root);
  if (!range) return;
  cleanupPlaceholders(root, range.collapsed ? range.startContainer : null);
  refreshState();
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmitted) return;
    const root = contentRef.value;
    // optional フィールドの空値（undefined → ''）のように、出力が同じになる値では読み直さない
    if (root && lastEmitted !== null) {
      const probe = root.ownerDocument.createElement('div');
      probe.innerHTML = toEditorHtml(value ?? '', features, linkPolicy.value);
      if (toOutputHtml(probe, features, linkPolicy.value) === lastEmitted) return;
    }
    load(value ?? '');
  }
);

onMounted(() => {
  load(props.modelValue ?? '');
  document.addEventListener('selectionchange', handleSelectionChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  if (recordTimer) clearTimeout(recordTimer);
});
</script>
