<template>
  <!-- テンプレート記法ヘルプモーダル -->
  <Teleport :to="teleportTo">
    <div v-if="show" class="zcode-help-modal-overlay" @click="$emit('close')">
      <div ref="modalContentRef" class="zcode-help-modal" @click.stop>
        <div class="zcode-help-modal-header">
          <div class="zcode-help-modal-header-title" role="heading" aria-level="3">
            {{ $t('partsManager.templateHelpTitle') }}
          </div>
          <button class="zcode-close-btn" :aria-label="$t('common.close')" @click="$emit('close')">
            <X :size="20" />
          </button>
        </div>

        <div class="zcode-help-modal-body">
          <table class="zcode-help-table">
            <thead>
              <tr>
                <th>{{ $t('partsManager.syntax') }}</th>
                <th>{{ $t('partsManager.description') }}</th>
                <th>{{ $t('partsManager.example') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>{$field:default}</code></td>
                <td>{{ $t('partsManager.templateHelp.textField') }}</td>
                <td><code>{$title:タイトル}</code></td>
              </tr>
              <tr>
                <td><code>{$field:default:rich}</code></td>
                <td>{{ $t('partsManager.templateHelp.richText') }}</td>
                <td><code>{$content:本文:rich}</code></td>
              </tr>
              <tr>
                <td><code>{$field:default:textarea}</code></td>
                <td>{{ $t('partsManager.templateHelp.textarea') }}</td>
                <td><code>{$description:説明:textarea}</code></td>
              </tr>
              <tr>
                <td><code>{$field:default:image}</code></td>
                <td>{{ $t('partsManager.templateHelp.image') }}</td>
                <td><code>{$hero:default.jpg:image}</code></td>
              </tr>
              <tr>
                <td><code>($field:option1|option2)</code></td>
                <td>{{ $t('partsManager.templateHelp.radio') }}</td>
                <td><code>($color:red|blue|green)</code></td>
              </tr>
              <tr>
                <td><code>($field:option1,option2)</code></td>
                <td>{{ $t('partsManager.templateHelp.checkbox') }}</td>
                <td><code>($features:fast,secure)</code></td>
              </tr>
              <tr>
                <td><code>($field@:option1|option2)</code></td>
                <td>{{ $t('partsManager.templateHelp.selectSingle') }}</td>
                <td><code>($size@:S|M|L)</code></td>
              </tr>
              <tr>
                <td><code>($field@:option1,option2)</code></td>
                <td>{{ $t('partsManager.templateHelp.selectMultiple') }}</td>
                <td><code>($tags@:tag1,tag2,tag3)</code></td>
              </tr>
              <tr>
                <td><code>z-if="show_field"</code></td>
                <td>{{ $t('partsManager.templateHelp.conditional') }}</td>
                <td><code>&lt;div z-if="show_content"&gt;...&lt;/div&gt;</code></td>
              </tr>
              <tr>
                <td><code>z-slot="name"</code></td>
                <td>{{ $t('partsManager.templateHelp.slot') }}</td>
                <td><code>&lt;div z-slot="content"&gt;&lt;/div&gt;</code></td>
              </tr>
            </tbody>
          </table>

          <div class="zcode-help-section">
            <div class="zcode-help-section-title" role="heading" aria-level="4">
              {{ $t('partsManager.templateHelp.note') }}
            </div>
            <div role="list" class="zcode-help-section-list">
              <div role="listitem" class="zcode-help-section-item">
                {{ $t('partsManager.templateHelp.fieldNameNote') }}
              </div>
              <div role="listitem" class="zcode-help-section-item">
                {{ $t('partsManager.templateHelp.defaultValueNote') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from '../../../core/icons';
import { ref } from 'vue';
import { useZcodeTeleportTo } from '../../../core/composables/useZcodeTeleportTo';
import { useModalA11y } from '../../../core/composables/useModalA11y';

const props = defineProps<{ show: boolean }>();

const emit = defineEmits<{ close: [] }>();

const teleportTo = useZcodeTeleportTo();

const modalContentRef = ref<HTMLElement | null>(null);
useModalA11y(
  () => props.show,
  () => emit('close'),
  modalContentRef
);
</script>
