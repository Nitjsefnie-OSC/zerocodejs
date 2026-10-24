import type { RichTextFeature, RichTextLinkMode } from '../features/editor/rich-text/features';

// データ型定義
export interface ZeroCodeData {
  version?: number; // データ形式のバージョン（未指定は 1 とみなす）
  page: ComponentData[];
  css: {
    common?: string; // 共通パーツ用CSS
    individual?: string; // 個別パーツ用CSS
    special?: string; // 専用パーツ用CSS（内部キー special）
  };
  parts: {
    common: TypeData[];
    individual: TypeData[];
    special: TypeData[];
  };
  images: {
    common: ImageData[];
    individual: ImageData[];
    special: ImageData[];
  };
  backendData?: Record<string, unknown>; // バックエンドデータ
}

export interface ComponentData {
  id: string;
  part_id: string; // パーツID（タイトル変更時も紐付けが維持される）
  [key: string]: unknown;
  slots?: Record<string, ComponentData[] | SlotConfig>;
}

export interface SlotConfig {
  allowedParts?: string[]; // 許可されるパーツID
  children?: ComponentData[]; // 子コンポーネント（既存の形式との互換性）
}

export interface TypeData {
  id: string; // タイプID（タイプ変更時も紐付けが維持される）
  type: string;
  description: string;
  parts: PartData[];
}

export interface PartData {
  id: string; // パーツID（タイトル変更時も紐付けが維持される）
  title: string;
  description: string;
  body: string;
  slots?: Record<string, { allowedParts?: string[] }>; // allowedPartsはパーツIDの配列
  slotOnly?: boolean; // スロット専用パーツ（通常の追加パネルには表示しない）
  outlinePosition?: 'inner'; // 未指定は外側。'inner' のときのみ内側にアウトライン表示
}

export interface ImageData {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  needsUpload?: boolean;
  /** 専用画像のみ。未指定または shared は全ページで選択可能 */
  scope?: 'shared' | 'page';
  /** scope が page のとき、このページ ID の編集画面でのみ選択可能 */
  pageId?: string;
}

export interface CMSSettings {
  allowDynamicContentInteraction?: boolean;
  devRightPadding?: boolean;
  enableContextMenu?: boolean;
  showSaveConfirm?: boolean; // 保存時の確認ダイアログを表示する（デフォルト: true）
  scrollIntoViewOnPartEdit?: boolean;
  /** 未選択時に全パーツへ薄い点線を表示（オフでホバー時のみ） */
  showPartDiscoveryOutlines?: boolean;
  /** 追加モードでプレビュー上の挿入位置ボタン（前に追加/後に追加）を表示する */
  showAddBetweenButtons?: boolean;
  /** 並べ替えモードで同階層パーツのラベルを表示する */
  showReorderStructureLabels?: boolean;
}

export interface DevSettings {
  showDataViewer?: boolean;
  dontShowCssWarningAgainCommon?: boolean;
  showSaveConfirm?: boolean; // 保存時の確認ダイアログを表示する（デフォルト: true）
}

export interface UserSettings {
  locale?: 'ja' | 'en';
  cms?: CMSSettings;
  dev?: DevSettings;
}

export interface StudioSettings {
  showSaveConfirm?: boolean;
  sanitizePartTemplate?: boolean;
  /**
   * 指定したカテゴリをパーツマネージャー（タイプ/パーツの追加・編集・削除・並べ替えUI）から
   * 除外する。タブ自体を表示せず、一覧にも出さない。
   * 用途例: 特定カテゴリのパーツ定義をアプリコード側で管理し、CMS上のGUI編集を禁止したい場合。
   */
  hiddenCategories?: Array<'common' | 'individual' | 'special'>;
}

export interface RichTextSettings {
  /** リッチテキストエディタで使える機能。未指定時は DEFAULT_RICH_TEXT_FEATURES */
  features?: RichTextFeature[];
  link?: {
    /** リンクの入力方式（未指定時は free） */
    mode?: RichTextLinkMode;
    /** リンク候補（{ label, url, newTab? } の配列）を指す backendData のパス */
    source?: string;
  };
}

export interface ImageUploadSettings {
  /** 追加・差し替えできるファイルの種類（input の accept と同じ書き方。未指定は image/*） */
  accept?: string;
  /** 追加・差し替えできるファイルの最大サイズ（バイト） */
  maxSize?: number;
}

export interface CMSConfig {
  cms?: CMSSettings;
  dev?: DevSettings;
  studio?: StudioSettings;
  richText?: RichTextSettings;
  images?: ImageUploadSettings;
  categoryOrder?: 'common' | 'individual' | 'special';
}

export type ImageCategory = 'common' | 'individual' | 'special';
export type ZeroCodeSource = 'cms' | 'editor' | 'studio';

export interface ImageHookContext {
  /** 画像を追加・差し替えるカテゴリ */
  category: ImageCategory;
  /** 要素の page-id 属性 */
  pageId?: string;
  /** 呼び出した画面（save-request の source と同じ） */
  source: ZeroCodeSource;
  /** 差し替えのとき、差し替える画像の ID */
  replacingId?: string;
}

export interface UploadedImage {
  url: string;
  /** 省略時は自動で付ける。ほかの画像と重なるときは末尾に番号を付ける */
  id?: string;
  /** 省略時はファイル名 */
  name?: string;
}

export interface MediaImage {
  id: string;
  url: string;
  name?: string;
}

/**
 * ホストが要素の hooks プロパティ（Vue では hooks prop）で渡す関数。
 * config は属性の JSON 文字列のため、関数はこちらで渡す。
 */
export interface ZeroCodeHooks {
  /**
   * 画像を追加・差し替えた時点で呼ぶ。返した URL を画像のデータに入れる。
   * 未指定のときは base64 にして needsUpload: true を付ける（保存時にホストがアップロードする）
   */
  uploadImage?: (file: File, context: ImageHookContext) => Promise<UploadedImage>;
  /** 指定すると、画像の一覧に「メディアから選ぶ」を出す。選んだ画像は URL を参照として登録する */
  listImages?: (context: ImageHookContext) => Promise<MediaImage[]>;
  /** パーツ管理でパーツを保存する前に、テンプレートを受け取って返す */
  beforeSavePart?: (body: string) => string | Promise<string>;
}

// ZeroCodeDataのprops型定義
export interface ZeroCodeDataProps {
  locale?: string;
  page?: string;
  cssCommon?: string;
  cssIndividual?: string;
  cssSpecial?: string;
  partsCommon?: string;
  partsIndividual?: string;
  partsSpecial?: string;
  imagesCommon?: string;
  imagesIndividual?: string;
  imagesSpecial?: string;
  config?: string;
  endpoints?: string;
  backendData?: string;
}
