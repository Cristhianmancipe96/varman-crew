Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$proj = "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos"
$src  = Join-Path $proj "Proyecto_zapatosfotos catalogo\Fotos Junio"
$inHtml  = Join-Path $proj "web-tienda\varman_crew (19).html"
$outHtml = Join-Path $proj "web-tienda\varman_crew_web.html"

# --- Lista de fotos ordenada de mas reciente a mas antigua ---
$files = Get-ChildItem -Path $src -Filter *.jpg
$parsed = foreach ($f in $files) {
  if ($f.Name -match 'Picsart_(\d{2})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})') {
    $dt = Get-Date -Year (2000 + [int]$matches[1]) -Month ([int]$matches[2]) -Day ([int]$matches[3]) -Hour ([int]$matches[4]) -Minute ([int]$matches[5]) -Second ([int]$matches[6])
    [pscustomobject]@{ File=$f; DT=$dt }
  }
}
$sorted = @($parsed | Sort-Object DT -Descending)
function PathOf([int]$n) { return $sorted[$n-1].File.FullName }

# --- Codificador JPEG ---
$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]70)

$cache = @{}
function ToB64([int]$n, [int]$maxDim = 600) {
  if ($cache.ContainsKey($n)) { return $cache[$n] }
  $img = [System.Drawing.Image]::FromFile((PathOf $n))
  $scale = [math]::Min(1.0, $maxDim / [math]::Max($img.Width, $img.Height))
  $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $gg = [System.Drawing.Graphics]::FromImage($bmp)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.DrawImage($img, 0, 0, $w, $h)
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, $jpgCodec, $ep)
  $b64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($ms.ToArray())
  $ms.Dispose(); $gg.Dispose(); $bmp.Dispose(); $img.Dispose()
  $cache[$n] = $b64
  return $b64
}

# --- 50 referencias UNICAS. Cada foto se usa una sola vez (sin duplicados). ---
# Main = foto principal; Views = vistas extra del MISMO zapato.
$M = @(
  @{Main=5;   Views=@(7,6);            Cat='deportivas'; Price='259.900'; Tag='Nuevo'},
  @{Main=8;   Views=@(9,10,29,30);     Cat='casuales';   Price='259.900'; Tag='Nuevo'},
  @{Main=11;  Views=@(12,13,14);       Cat='deportivas'; Price='389.900'; Tag='Popular'},
  @{Main=19;  Views=@(20,21);          Cat='deportivas'; Price='299.900'; Tag='Nuevo'},
  @{Main=22;  Views=@(23,24);          Cat='urbanas';    Price='480.000'; Tag=''},
  @{Main=25;  Views=@(26);             Cat='urbanas';    Price='480.000'; Tag=''},
  @{Main=40;  Views=@(41);             Cat='deportivas'; Price='269.900'; Tag=''},
  @{Main=45;  Views=@();               Cat='deportivas'; Price='259.900'; Tag=''},
  @{Main=49;  Views=@(50);             Cat='deportivas'; Price='289.900'; Tag=''},
  @{Main=51;  Views=@(52);             Cat='deportivas'; Price='299.900'; Tag=''},
  @{Main=54;  Views=@(55,56,57);       Cat='casuales';   Price='249.900'; Tag=''},
  @{Main=59;  Views=@(60);             Cat='casuales';   Price='329.900'; Tag=''},
  @{Main=62;  Views=@(63);             Cat='casuales';   Price='329.900'; Tag=''},
  @{Main=64;  Views=@(65);             Cat='casuales';   Price='289.900'; Tag=''},
  @{Main=66;  Views=@(102,101,67);     Cat='urbanas';    Price='369.900'; Tag='Popular'},
  @{Main=68;  Views=@(69);             Cat='urbanas';    Price='359.900'; Tag=''},
  @{Main=70;  Views=@(71);             Cat='casuales';   Price='249.900'; Tag=''},
  @{Main=72;  Views=@();               Cat='deportivas'; Price='269.900'; Tag=''},
  @{Main=73;  Views=@();               Cat='urbanas';    Price='359.900'; Tag=''},
  @{Main=74;  Views=@();               Cat='urbanas';    Price='359.900'; Tag=''},
  @{Main=75;  Views=@(76);             Cat='urbanas';    Price='349.900'; Tag=''},
  @{Main=77;  Views=@();               Cat='urbanas';    Price='399.900'; Tag='Popular'},
  @{Main=79;  Views=@(80,81);          Cat='urbanas';    Price='369.900'; Tag=''},
  @{Main=82;  Views=@();               Cat='casuales';   Price='339.900'; Tag=''},
  @{Main=84;  Views=@();               Cat='urbanas';    Price='389.900'; Tag=''},
  @{Main=85;  Views=@(86);             Cat='casuales';   Price='259.900'; Tag=''},
  @{Main=89;  Views=@();               Cat='urbanas';    Price='379.900'; Tag=''},
  @{Main=91;  Views=@(92);             Cat='deportivas'; Price='399.900'; Tag=''},
  @{Main=93;  Views=@(94);             Cat='urbanas';    Price='399.900'; Tag='Popular'},
  @{Main=97;  Views=@();               Cat='deportivas'; Price='409.900'; Tag=''},
  @{Main=98;  Views=@();               Cat='deportivas'; Price='409.900'; Tag=''},
  @{Main=103; Views=@(104);            Cat='deportivas'; Price='399.900'; Tag=''},
  @{Main=107; Views=@();               Cat='urbanas';    Price='369.900'; Tag=''}
)

$catLabel = @{ deportivas='Deportivas'; casuales='Casuales'; urbanas='Urbanas' }

# --- Validacion: ninguna foto puede repetirse entre referencias ---
$usadas = @{}
foreach ($mod in $M) {
  foreach ($n in (@($mod.Main) + $mod.Views)) {
    if ($usadas.ContainsKey($n)) { throw "Foto $n repetida en dos referencias" }
    $usadas[$n] = $true
  }
}

$sb = New-Object System.Text.StringBuilder
$idx = 0
foreach ($mod in $M) {
  $idx++
  $ref = "{0:D2}" -f $idx
  $imgs = @($mod.Main) + $mod.Views
  $b64list = @()
  foreach ($n in $imgs) { $b64list += (ToB64 $n) }
  $tagHtml = ""
  if ($mod.Tag -ne '') { $tagHtml = "<div class=`"prod-tag`">$($mod.Tag)</div>" }
  # Capas del carrusel: la primera visible, las demas se van mostrando con animacion
  $layers = ""
  for ($li = 0; $li -lt $b64list.Count; $li++) {
    $cls = if ($li -eq 0) { "cv active" } else { "cv" }
    $layers += "<img class=`"$cls`" src=`"$($b64list[$li])`" loading=`"lazy`" alt=`"`">"
  }
  $card = @"
    <div class="prod-card" data-cat="$($mod.Cat)" role="button" tabindex="0" aria-label="Ver $($catLabel[$mod.Cat]), `$$($mod.Price) COP">
      <div class="prod-img prod-carousel">
        $layers
        $tagHtml
        <span class="prod-zoom" aria-hidden="true"><i class="ti ti-arrows-maximize"></i></span>
      </div>
      <div class="prod-info">
        <div class="prod-cat">$($catLabel[$mod.Cat])</div>
        <div class="prod-foot">
          <div class="prod-price">`$ $($mod.Price) <small>COP</small></div>
          <button class="prod-btn js-wa" data-ref="$ref" data-precio="$($mod.Price)" aria-label="Pedir por WhatsApp"><i class="ti ti-brand-whatsapp"></i></button>
        </div>
      </div>
    </div>
"@
  [void]$sb.Append($card)
}
$cards = $sb.ToString()

# --- Reemplazar el contenido de la grilla de productos ---
$html = [System.IO.File]::ReadAllText($inHtml)
# Quitar el banner "Proximamente" (el catalogo ya tiene productos reales)
$html = [System.Text.RegularExpressions.Regex]::Replace($html, '(?s)<div class="coming-banner".*?</div>\s*', '', 1)
# Seguridad: agregar rel="noopener noreferrer" a los enlaces que abren en pestana nueva (evita reverse tabnabbing)
$html = $html.Replace('target="_blank"', 'target="_blank" rel="noopener noreferrer"')
# BUG FIX: desactivar el "reveal" de las tarjetas atado al scroll. Arrancaban en opacity:0 y,
# al filtrar (cambia el alto de la pagina), ScrollTrigger no se redisparaba y quedaban invisibles
# hasta refrescar. Ahora las tarjetas son visibles por defecto (CSS) y el filtro maneja su propia animacion.
$html = [System.Text.RegularExpressions.Regex]::Replace($html, "(?s)gsap\.fromTo\('\.prod-card',.*?\);", "/* reveal de tarjetas desactivado: visibles por defecto para que nunca falten al filtrar */")
# BUG FIX: el filtro mostraba las tarjetas con un fundido via requestAnimationFrame (se pausa en
# pestanas ocultas/algunos navegadores y las dejaba invisibles). Ahora la tarjeta queda visible al
# instante (opacidad 1) y solo se desliza con una animacion CSS decorativa que no afecta visibilidad.
$html = [System.Text.RegularExpressions.Regex]::Replace($html, "(?s)card\.style\.opacity = '0';.*?\}\);", "card.style.opacity = '1';`r`n      card.classList.remove('vm-in'); void card.offsetWidth; card.classList.add('vm-in');")
# Seguridad: fijar version de Tabler y agregar SRI (integrity) + crossorigin a los recursos de CDN
$html = $html.Replace(
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">',
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/dist/tabler-icons.min.css" integrity="sha384-ccZHbezhtZWmNy0cg8odL0D/jFU5k5HIls9y78Qd6lWor7rpvFIZtK0fTFG4z456" crossorigin="anonymous" referrerpolicy="no-referrer">')
$html = $html.Replace(
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="sha512-7eHRwcbYkK4d9g/6tD/mhkf++eoTHwpNM9woBxtPUBWm67zeAfFC+HrdoE2GanKeocly/VxeLvIqwvCdk7qScg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>')
$html = $html.Replace(
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" integrity="sha512-onMTRKJBKz8M1TnqqDuGBlowlH0ohFzMXYRNebz+yOcc5TQr/zAKsthzhuv0hiyUKEiQEQXEynnXCvNTOk50dg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>')
$newGrid = "<div class=`"prod-grid`">`r`n$cards`r`n  </div>`r`n</section>"
$pattern = '(?s)<div class="prod-grid">.*?</div>\s*</section>'
$html = [System.Text.RegularExpressions.Regex]::Replace($html, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($x) $newGrid }, 1)

# --- CSS del carrusel (una sola foto que cambia con animacion de fundido) ---
$headCss = @"
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/favicon.png">
<meta property="og:image" content="https://varmancrew.netlify.app/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://varmancrew.netlify.app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VarMan Crew">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="VarMan Crew — Zapatos y sneakers">
<meta name="twitter:description" content="Mira el catálogo y pide directo por WhatsApp.">
<meta name="twitter:image" content="https://varmancrew.netlify.app/og-image.jpg">
<style>
.prod-carousel .cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease, transform .6s cubic-bezier(0.22,1,0.36,1);}
.prod-carousel .cv.active{opacity:1;}
.prod-card:hover .cv.active{transform:scale(1.05);}
.prod-info .prod-cat{margin-bottom:var(--s4);font-weight:700;}
.prod-card{cursor:pointer;opacity:1;}
.prod-card:focus-visible{outline:2px solid var(--brand,#ff6b00);outline-offset:3px;}
@keyframes vmCardIn{from{transform:translateY(10px)}to{transform:none}}
.prod-card.vm-in{animation:vmCardIn .28s cubic-bezier(0.16,1,0.3,1);}
@media (prefers-reduced-motion: reduce){.prod-card.vm-in{animation:none;}}
.prod-btn i{font-size:18px;}
/* Indicador de "ver detalle" sobre la foto */
.prod-zoom{position:absolute;top:var(--s3,12px);right:var(--s3,12px);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);color:#fff;opacity:0;transform:scale(.85);transition:opacity .25s ease, transform .25s ease;pointer-events:none;z-index:2;}
.prod-zoom i{font-size:16px;}
.prod-card:hover .prod-zoom,.prod-card:focus-visible .prod-zoom{opacity:1;transform:scale(1);}
/* Modal de detalle */
.vm-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:16px;}
.vm-modal.open{display:flex;}
.vm-modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,.74);backdrop-filter:blur(4px);}
.vm-modal-box{position:relative;z-index:1;background:var(--surf-1,#15151a);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:var(--r-lg,18px);max-width:440px;width:100%;max-height:94vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:vmPop .28s cubic-bezier(0.22,1,0.36,1);}
@keyframes vmPop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
.vm-modal-close{position:absolute;top:10px;right:10px;z-index:3;width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:22px;line-height:1;cursor:pointer;transition:background .2s ease;}
.vm-modal-close:hover{background:var(--brand,#ff6b00);}
.vm-gallery{position:relative;aspect-ratio:1/1;background:var(--surf-2,#0e0e12);}
.vm-gallery-img{width:100%;height:100%;object-fit:cover;display:block;}
.vm-counter{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);color:#fff;font-size:11px;font-weight:700;letter-spacing:.05em;padding:4px 9px;border-radius:99px;}
.vm-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.45);color:#fff;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s ease;}
.vm-nav:hover{background:var(--brand,#ff6b00);}
.vm-prev{left:10px;}
.vm-next{right:10px;}
.vm-dots{position:absolute;bottom:10px;left:0;right:0;display:flex;gap:6px;justify-content:center;}
.vm-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);transition:background .2s ease;}
.vm-dot.on{background:var(--brand,#ff6b00);}
.vm-modal-info{padding:20px 22px 24px;}
.vm-modal-cat{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--brand,#ff6b00);margin-bottom:6px;}
.vm-modal-price{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--ink,#fff);margin-bottom:12px;}
.vm-modal-desc{font-size:14px;line-height:1.6;color:var(--ink-2,#b8b8c0);margin-bottom:18px;max-width:60ch;}
.vm-modal-wa{width:100%;padding:15px;border:none;border-radius:12px;background:var(--brand,#ff6b00);color:#fff;font-weight:800;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s ease, transform .1s ease;}
.vm-modal-wa:hover{background:var(--brand-hover,#e85d00);}
.vm-modal-wa:active{transform:scale(.98);}
.vm-modal-wa i{font-size:19px;}
.vm-fab{position:fixed;right:18px;bottom:18px;z-index:900;width:58px;height:58px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:transform .2s ease, box-shadow .2s ease;animation:vmFabPulse 2.6s ease-out infinite;}
.vm-fab i{font-size:32px;}
.vm-fab:hover{transform:scale(1.08);box-shadow:0 12px 30px rgba(37,211,102,.55);}
.vm-fab:active{transform:scale(.96);}
@keyframes vmFabPulse{0%{box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 0 0 rgba(37,211,102,.5)}70%{box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 0 16px rgba(37,211,102,0)}100%{box-shadow:0 8px 24px rgba(0,0,0,.35), 0 0 0 0 rgba(37,211,102,0)}}
@media (prefers-reduced-motion: reduce){
  .prod-carousel .cv{transition:opacity .2s linear;}
  .prod-card:hover .cv.active{transform:none;}
  .prod-card:hover{transform:none;}
  .vm-modal-box{animation:none;}
  .vm-fab{animation:none;}
}
</style>
</head>
"@
$html = $html.Replace('</head>', $headCss)

# --- Scripts: WhatsApp + carrusel automatico ---
$waScript = @"
<a class="vm-fab" href="https://wa.me/573042916972?text=Hola%20VarMan%20Crew%20%F0%9F%91%9F%2C%20quiero%20informaci%C3%B3n%20sobre%20los%20zapatos" target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp" title="Escríbenos por WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>
<div id="vm-modal" class="vm-modal" aria-hidden="true">
  <div class="vm-modal-overlay" data-close></div>
  <div class="vm-modal-box" role="dialog" aria-modal="true">
    <button class="vm-modal-close" data-close aria-label="Cerrar">&times;</button>
    <div class="vm-gallery">
      <img class="vm-gallery-img" src="" alt="Foto del modelo">
      <div class="vm-counter"></div>
      <button class="vm-nav vm-prev" aria-label="Foto anterior">&#8249;</button>
      <button class="vm-nav vm-next" aria-label="Foto siguiente">&#8250;</button>
      <div class="vm-dots"></div>
    </div>
    <div class="vm-modal-info">
      <div class="vm-modal-cat"></div>
      <div class="vm-modal-price"></div>
      <p class="vm-modal-desc"></p>
      <button class="vm-modal-wa js-wa" data-ref="" data-precio=""><i class="ti ti-brand-whatsapp"></i> Pedir por WhatsApp</button>
    </div>
  </div>
</div>
<script>
// --- Pedido por WhatsApp (tarjetas y modal) ---
document.addEventListener('click', function(e){
  var b = e.target.closest('.js-wa'); if(!b) return;
  e.stopPropagation();
  var r = b.getAttribute('data-ref')||'', p = b.getAttribute('data-precio')||'';
  var t = 'Hola VarMan Crew \u{1F45F}\n\nMe interesa la referencia #'+r+(p?' (\$'+p+' COP)':'')+'.\n¿Está disponible? ¿Qué tallas hay?';
  window.open('https://wa.me/573042916972?text='+encodeURIComponent(t),'_blank','noopener');
});
// --- Carrusel automatico en las tarjetas ---
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return; // respeta la preferencia de menos movimiento
  document.querySelectorAll('.prod-carousel').forEach(function(c){
    var imgs = c.querySelectorAll('.cv');
    if(imgs.length < 2) return;
    var i = 0, timer = null;
    function step(){ imgs[i].classList.remove('active'); i=(i+1)%imgs.length; imgs[i].classList.add('active'); }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ if(!timer){ timer = setInterval(step, 2600 + Math.floor(Math.random()*1400)); } }
        else if(timer){ clearInterval(timer); timer = null; }
      });
    }, {threshold:0.25});
    io.observe(c);
  });
})();
// --- Vista detallada (modal con galeria) ---
(function(){
  var modal = document.getElementById('vm-modal');
  var gImg = modal.querySelector('.vm-gallery-img');
  var gDots = modal.querySelector('.vm-dots');
  var mCat = modal.querySelector('.vm-modal-cat');
  var mPrice = modal.querySelector('.vm-modal-price');
  var mDesc = modal.querySelector('.vm-modal-desc');
  var mWa = modal.querySelector('.vm-modal-wa');
  var prevBtn = modal.querySelector('.vm-prev');
  var nextBtn = modal.querySelector('.vm-next');
  var closeBtn = modal.querySelector('.vm-modal-close');
  var counter = modal.querySelector('.vm-counter');
  var imgs = [], idx = 0, lastFocus = null;
  var DESCR = {
    deportivas: 'Silueta deportiva, liviana y cómoda para el día a día o para entrenar. Calidad garantizada y disponible en varias tallas.',
    casuales: 'Estilo casual y versátil que combina con todo. Cómodos para uso diario. Disponibles en varias tallas.',
    urbanas: 'Edición urbana de alto impacto, perfecta para destacar tu estilo en la calle. Disponible en varias tallas.'
  };
  var CATLBL = { deportivas:'Deportivas', casuales:'Casuales', urbanas:'Urbanas' };
  function render(){
    gImg.src = imgs[idx];
    var single = imgs.length < 2;
    prevBtn.style.display = single ? 'none' : '';
    nextBtn.style.display = single ? 'none' : '';
    counter.style.display = single ? 'none' : '';
    counter.textContent = (idx+1) + ' / ' + imgs.length;
    var dots = '';
    for(var k=0;k<imgs.length;k++){ dots += '<span class="vm-dot'+(k===idx?' on':'')+'"></span>'; }
    gDots.innerHTML = single ? '' : dots;
  }
  function go(d){ idx = (idx + d + imgs.length) % imgs.length; render(); }
  function openCard(card){
    imgs = [].map.call(card.querySelectorAll('.cv'), function(im){ return im.getAttribute('src'); });
    idx = 0;
    var cat = card.getAttribute('data-cat');
    mCat.textContent = CATLBL[cat] || '';
    mPrice.innerHTML = card.querySelector('.prod-price').innerHTML;
    mDesc.textContent = DESCR[cat] || '';
    var btn = card.querySelector('.js-wa');
    mWa.setAttribute('data-ref', btn.getAttribute('data-ref'));
    mWa.setAttribute('data-precio', btn.getAttribute('data-precio'));
    render();
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if(closeBtn) closeBtn.focus();
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if(lastFocus && lastFocus.focus){ lastFocus.focus(); }
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('.js-wa')) return;
    if(e.target.closest('[data-close]')){ closeModal(); return; }
    if(e.target.closest('.vm-prev')){ go(-1); return; }
    if(e.target.closest('.vm-next')){ go(1); return; }
    var card = e.target.closest('.prod-card');
    if(card){ openCard(card); }
  });
  document.addEventListener('keydown', function(e){
    if(modal.classList.contains('open')){
      if(e.key === 'Escape') closeModal();
      else if(e.key === 'ArrowLeft') go(-1);
      else if(e.key === 'ArrowRight') go(1);
      return;
    }
    if((e.key === 'Enter' || e.key === ' ')){
      var card = e.target.closest && e.target.closest('.prod-card');
      if(card){ e.preventDefault(); openCard(card); }
    }
  });
  var sx = 0;
  modal.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive:true});
  modal.addEventListener('touchend', function(e){ var dx = e.changedTouches[0].clientX - sx; if(Math.abs(dx) > 40){ go(dx < 0 ? 1 : -1); } });
})();
// --- Recalcular posiciones de las animaciones (evita secciones en blanco tras filtrar) ---
(function(){
  function refreshST(){ if(window.ScrollTrigger){ try { ScrollTrigger.refresh(); } catch(e){} } }
  document.addEventListener('click', function(e){ if(e.target.closest('.f-btn')){ setTimeout(refreshST, 80); } });
  window.addEventListener('load', refreshST);
})();
</script>
</body>
"@
$html = $html.Replace('</body>', $waScript)

# --- Empaquetar carpeta 'publicar' lista para Netlify ---
$pub = Join-Path $proj "web-tienda\publicar"
$imgDir = Join-Path $pub "img"
New-Item -ItemType Directory -Force -Path $pub | Out-Null
if (Test-Path $imgDir) { Remove-Item $imgDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null

# Externalizar TODAS las imagenes base64 a archivos (HTML liviano -> la vista previa de
# WhatsApp/redes funciona; los crawlers no leen HTML de mas de 5MB). Tambien carga mas rapido.
$script:ni = 0
$script:seen = @{}
$rx = [regex]'data:(?<mime>[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+);base64,(?<b64>[A-Za-z0-9+/=]+)'
$html = $rx.Replace($html, [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  $full = $m.Value
  if ($script:seen.ContainsKey($full)) { return $script:seen[$full] }
  $script:ni++
  $ext = (($m.Groups['mime'].Value -split '/')[1]) -replace '\+.*$',''
  if ($ext -eq 'jpeg') { $ext = 'jpg' }
  $rel = "img/p{0:D3}.{1}" -f $script:ni, $ext
  [System.IO.File]::WriteAllBytes((Join-Path $pub ($rel -replace '/','\')), [Convert]::FromBase64String($m.Groups['b64'].Value))
  $script:seen[$full] = $rel
  return $rel
})

# Reemplazar el video del hero por la version optimizada (de ~5MB a ~0.24MB, mismo nombre)
$heroOpt = Join-Path $proj "web-tienda\assets\hero.mp4"
if (Test-Path $heroOpt) {
  Get-ChildItem $imgDir -Filter *.mp4 | ForEach-Object { Copy-Item $heroOpt $_.FullName -Force }
}

# Guardar el HTML liviano como index.html del sitio
$indexPath = Join-Path $pub "index.html"
[System.IO.File]::WriteAllText($indexPath, $html, (New-Object System.Text.UTF8Encoding($false)))

# Copiar vista previa (og) y favicon
$assets = Join-Path $proj "web-tienda\assets"
foreach ($a in 'og-image.jpg','favicon.png') {
  $ap = Join-Path $assets $a
  if (Test-Path $ap) { Copy-Item $ap (Join-Path $pub $a) -Force }
}
$headers = @"
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
"@
[System.IO.File]::WriteAllText((Join-Path $pub "_headers"), $headers, (New-Object System.Text.UTF8Encoding($false)))

# Borrar el HTML standalone viejo (ya no se usa; el sitio es publicar/index.html + img/)
if (Test-Path $outHtml) { Remove-Item $outHtml -Force }

$htmlKB = [math]::Round((Get-Item $indexPath).Length / 1KB, 1)
$imgN = (Get-ChildItem $imgDir -File).Count
Write-Output ("Sitio listo en: " + $pub)
Write-Output ("index.html: " + $htmlKB + " KB   |   imagenes externas: " + $imgN + "   |   referencias: " + $M.Count)
