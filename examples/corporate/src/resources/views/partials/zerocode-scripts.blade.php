<script src="https://unpkg.com/vue@3.5/dist/vue.global.prod.js"></script>
<script src="{{ asset('dist/zerocode.umd.js') }}"></script>
<link rel="stylesheet" href="{{ asset('dist/zerocodejs.css') }}">
<script src="{{ asset('js/zerocode-api.js') }}"></script>
<script>
(function () {
  var componentTag = '{{ $componentTag ?? "zcode-editor" }}';
  function init() {
    ZeroCodeApi.setupApiSaveListeners();
    var container = document.getElementById('zcode-edit-container');
    if (!container) return;
    var component = container.querySelector('zcode-editor') || container.querySelector('zcode-cms');
    if (!component) return;
    var pageId = container.getAttribute('data-page-id');
    var newsSlug = container.getAttribute('data-news-slug');
    ZeroCodeApi.loadDataIntoComponent(component, pageId || null, newsSlug || null).catch(function (err) {
      console.error('ZeroCode load error:', err);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      customElements.whenDefined(componentTag).then(init);
    });
  } else {
    customElements.whenDefined(componentTag).then(init);
  }
})();
</script>
