<div id="zcode-public-content" data-page-id="{{ $pageId ?? '' }}" data-news-slug="{{ $newsSlug ?? '' }}">
    <p>読み込み中…</p>
</div>
<script src="https://unpkg.com/vue@3.5/dist/vue.global.prod.js"></script>
<script src="{{ asset('dist/zerocode.umd.js') }}"></script>
<script>
(function () {
  var container = document.getElementById('zcode-public-content');
  if (!container) return;
  var pageId = container.getAttribute('data-page-id');
  var newsSlug = container.getAttribute('data-news-slug');
  var url = pageId
    ? '/api/data?page=' + encodeURIComponent(pageId)
    : '/api/data?news=' + encodeURIComponent(newsSlug);
  if (!pageId && !newsSlug) {
    container.innerHTML = '<p>（コンテンツは編集画面で追加できます）</p>';
    return;
  }
  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    })
    .then(function (data) {
      var styleEl = document.getElementById('zcode-public-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'zcode-public-css';
        document.head.appendChild(styleEl);
      }
      var css = (data.css && (data.css.common || data.css.individual || data.css.special))
        ? [data.css.common || '', data.css.individual || '', data.css.special || ''].join('\n')
        : '';
      styleEl.textContent = css;
      if (typeof ZeroCode !== 'undefined' && ZeroCode.renderToHtml) {
        var html = ZeroCode.renderToHtml(data, { enableEditorAttributes: false });
        container.innerHTML = html || '<p>（コンテンツはありません）</p>';
      } else {
        container.innerHTML = '<p>（表示に必要なスクリプトを読み込んでください）</p>';
      }
    })
    .catch(function () {
      container.innerHTML = '<p>（コンテンツの読み込みに失敗しました）</p>';
    });
})();
</script>
