/*
 * "Buy" button + live price for pages outside the platform (a launch page, a blog, a link-in-bio).
 *
 *   <a data-yws-buy data-store="lola-y-su-pandilla" data-product="PRODUCT_ID">Comprar</a>
 *   <span data-yws-price data-store="lola-y-su-pandilla" data-product="PRODUCT_ID">$9.99</span>
 *   <script src="https://yws.yordeniscorreoso.com/buy-widget.js" defer></script>
 *
 * The button's link is set before anything is fetched, so it works even if the price lookup fails.
 * The price is only for display: checkout always charges the price stored on the server. The text
 * already inside a [data-yws-price] element stays as the fallback when the lookup fails.
 * Optional: [data-yws-compare] shows the "before" price (empty when there is none).
 * The lookup is a cross-origin request, so the page's origin must be listed in the API's CORS_ORIGINS.
 */
;(function () {
  var script = document.currentScript
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin
  var api = origin + '/api/v1'

  function attr(el, name) {
    return (el.getAttribute(name) || '').trim()
  }

  function key(el) {
    return attr(el, 'data-store') + '/' + attr(el, 'data-product')
  }

  function money(amount, tenant) {
    try {
      return new Intl.NumberFormat(tenant.locale || undefined, {
        style: 'currency',
        currency: tenant.currency,
      }).format(amount)
    } catch {
      return tenant.currencySymbol + amount.toFixed(2)
    }
  }

  function json(url, headers) {
    return fetch(url, { headers: headers }).then(function (res) {
      if (!res.ok) throw new Error(String(res.status))
      return res.json().then(function (body) {
        return body.data
      })
    })
  }

  var buttons = document.querySelectorAll('[data-yws-buy]')
  Array.prototype.forEach.call(buttons, function (el) {
    var store = attr(el, 'data-store')
    var product = attr(el, 'data-product')
    if (!store || !product) return
    el.setAttribute('href', origin + '/store/' + encodeURIComponent(store) + '/buy/' + encodeURIComponent(product))
  })

  var seen = {}
  Array.prototype.forEach.call(document.querySelectorAll('[data-yws-price],[data-yws-compare]'), function (el) {
    var k = key(el)
    if (!attr(el, 'data-store') || !attr(el, 'data-product') || seen[k]) return
    seen[k] = true
    var store = attr(el, 'data-store')
    var product = attr(el, 'data-product')
    Promise.all([
      json(api + '/tenants/storefront/' + encodeURIComponent(store)),
      json(api + '/storefront/products/' + encodeURIComponent(product), { 'X-Tenant-ID': store }),
    ])
      .then(function (r) {
        var tenant = r[0]
        var item = r[1]
        var price = Number(item.price)
        var before = item.compareAtPrice == null ? 0 : Number(item.compareAtPrice)
        if (!isFinite(price)) return
        Array.prototype.forEach.call(document.querySelectorAll('[data-yws-price]'), function (p) {
          if (key(p) === k) p.textContent = money(price, tenant)
        })
        Array.prototype.forEach.call(document.querySelectorAll('[data-yws-compare]'), function (p) {
          if (key(p) === k) p.textContent = before > price ? money(before, tenant) : ''
        })
      })
      .catch(function () {
        /* keep the fallback text */
      })
  })
})()
