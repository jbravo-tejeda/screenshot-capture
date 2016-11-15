
var jcrop
var state = {
  active: false,
  selection: null
}

chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({}) // prevent re-injecting

    if (!jcrop) {
      init(() => {
        state.active = !state.active
        $('.jcrop-holder')[state.active ? 'show' : 'hide']()
        chrome.runtime.sendMessage({message: 'active', active: state.active})
        capture()
      })
    }
    else {
      state.active = !state.active
      $('.jcrop-holder')[state.active ? 'show' : 'hide']()
      chrome.runtime.sendMessage({message: 'active', active: state.active})
      capture(true)
    }
  }
  return true
})

function init (done) {
  // add fake image
  var image = new Image()
  image.id = 'fake-image'
  image.src = chrome.runtime.getURL('/images/pixel.png')
  image.onload = () => {
    $('body').append(image)

    // init jcrop
    $('#fake-image').Jcrop({
      bgColor: 'none',
      onSelect: (e) => {
        state.selection = e
        capture()
      },
      onChange: (e) => {
        state.selection = e
      },
      onRelease: (e) => {
        setTimeout(() => {
          state.selection = null
        }, 100)
      }
    }, function ready () {
      jcrop = this

      // fix styles
      $('.jcrop-holder').css({
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%', zIndex: 10000
      })
      $('.jcrop-hline, .jcrop-vline').css({
        backgroundImage: 'url(' + chrome.runtime.getURL('/images/Jcrop.gif') + ')'
      })
      // hide jcrop holder by default
      $('.jcrop-holder').hide()

      done()
    })
  }
}

function capture (force) {
  chrome.storage.sync.get((config) => {
    if (state.selection && (config.method === 'crop' || (config.method === 'wait' && force))) {
      jcrop.release()
      setTimeout(() => {
        chrome.runtime.sendMessage({
          message: 'capture', area: state.selection, dpr: devicePixelRatio
        }, (res) => {
          state.active = false
          state.selection = null
          $('.jcrop-holder').hide()
          chrome.runtime.sendMessage({message: 'active', active: state.active})
          save(res.image)
        })
      }, 50)
    }
    else if (config.method === 'view') {
      chrome.runtime.sendMessage({
        message: 'capture', area: {x: 0, y: 0, w: innerWidth, h: innerHeight}, dpr: devicePixelRatio
      }, (res) => {
        state.active = false
        $('.jcrop-holder').hide()
        chrome.runtime.sendMessage({message: 'active', active: state.active})
        save(res.image)
      })
    }
  })
}

function filename () {
  var pad = (n) => ((n = n + '') && (n.length >= 2 ? n : '0' + n))
  var timestamp = ((now) =>
    [pad(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate())].join('-')
    + ' - ' +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('-')
  )(new Date())
  return 'Screenshot Capture - ' + timestamp + '.png'
}

function save (image) {
  var link = document.createElement('a')
  link.download = filename()
  link.href = image
  link.click()
}
