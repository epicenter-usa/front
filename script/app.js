window.map = undefined

let app = {

  api : 'https://epicenter-covid.elections.aws.wapo.pub/', //'https://tiago.live/',

  tilesets : {

    places : {
      'url'    : 'mapbox://tiagombp.534qejcf',
      'source' : 'places-src',
      'layer'  : 'vanishing_places-0bojlt',
      'id'     : 'place_id'
    },

    counties : {
      'url'    : 'mapbox://tiagombp.3sghzwwl',
      'source' : 'counties-src',
      'layer'  : 'all_counties-4eo3fz',
      'id'     : 'GEOID'
    }
  },

  element : document.querySelector( '.app' ),

  lang : document.documentElement.lang,

  error : {
    'en' : {
      1 : 'Apparently, you are outside of the United States. Could you please try entering an address?',
      2 : 'Oops! We were unable to use your location… How about entering your address?'
    }
  },

  color : function( name ) {

    let style = getComputedStyle( document.documentElement )
    let value = style.getPropertyValue( '--' + name )
    return value

  },

  browser : {

    iOS : function() {
      return navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/)
    }

  },

  data : {},

  parameters : {

    deaths : undefined,
    center : undefined,

    initialize : function() {

      let parameters = new URLSearchParams( window.location.search )

      if ( parameters.has( 'deaths' ) ) {

        let deaths = parseInt( parameters.get( 'deaths' ) )

        if ( deaths >= 10000 && deaths <= 200000 ) {

          app.parameters.deaths = deaths
          document.documentElement.dataset.arbitraryDeaths = deaths

        }

      }

      if ( parameters.has( 'center' ) ) {

        let center = JSON.parse( parameters.get( 'center' ) )
        app.parameters.center = center

      }

    }

  },

  variables : {

    elements : document.querySelectorAll( '[data-var]' ),

    initial : undefined,
    result : undefined,

    get : {

      "Death count" : function() {

        let deaths = app.variables.initial.deaths
        deaths = new Intl.NumberFormat( app.lang ).format( deaths )
        return deaths

      },

      "Death count rounded" : function() {

        let deaths = app.variables.initial.deaths
        let value = Math.round( deaths / 1000 )
        let string

        if ( app.lang == 'pt-br' )
          string = value + ' mil'

        if ( app.lang == 'en' )
          string = new Intl.NumberFormat( app.lang ).format( value * 1000 )

        return string

      },

      "Time since first death" : function() {

        let today = new Date()
        let first = new Date( 2020, 2, 29 )

        let diff = {}

        diff.milliseconds = today - first
        diff.days = Math.floor( diff.milliseconds / (1000*60*60*24) )

        let string = diff.days + ' '

        if ( app.lang == 'pt-br' )
          string += 'dias'

        if ( app.lang == 'en' )
          string += 'days'

        return string

      },

      "User city" : function() {

        let path = document.documentElement.getAttribute( 'path' )

        if ( app.data.counties ) {

          let id = app.variables.result.user_county.id
          return app.data.counties[ id ]

        } else {

          fetch( path + 'data/counties.json' )
            .then(response => response.json())
            .then(data => {

              app.data.counties = data
              app.variables.update( [ "User city" ] )

            })

        }

        return '…'

      },

      "User radius" : function() {

        let city = app.variables.result

        let miles = turf.distance(
          turf.helpers.point( city.radius.today.inner_point ),
          turf.helpers.point( city.radius.today.outer_point ),
          {units: 'miles'}
        )

        //if ( km < 1 )
        //  return Math.round( km * 1000 ) + 'm'

        let value = Math.round( miles * 10 ) / 10
        value = new Intl.NumberFormat( app.lang ).format( value )
        return  value +
                (miles < 1 ? ' mile' : ' miles')

      },

      "Nearest Landmark" : function() {

        let city = app.variables.result.nearest_landmark;

        return city.place_name  + (
          city.state_abbr == '' ?
          '' :
          ' (' + city.state_abbr + ')'
        )


      },

      "Nearest Landmark location" : function() {

        let city = app.variables.result.nearest_landmark
        return city.display_text.landmark

      },

      "Nearest Landmark location description" : function() {

        let city = app.variables.result.nearest_landmark
        return city.display_text.complement || ''

      },

      "Nearest Landmark radius" : function() {

        let city = app.variables.result.nearest_landmark
        let miles = turf.distance(
          turf.helpers.point( city.radius.today.inner_point ),
          turf.helpers.point( city.radius.today.outer_point ),
          {units: 'miles'}
        )

        //if ( km < 1 )
        //  return Math.round( km * 1000 ) + 'm'

        let value = Math.round( miles * 10 ) / 10
        value = new Intl.NumberFormat( app.lang ).format( value )
        return  value +
                (miles < 1 ? ' mile' : ' miles')

      },

      "Vanished place" : function() {

        let city = app.variables.result.vanishing_place
        return city.name + ' (' + city.state + ')'

      },

      "Vanished place population" : function() {

        let city = app.variables.result.vanishing_place
        let population = city.pop_2019
        let value = Math.round( population / 1000 )

        let string

        if ( app.lang == 'pt-br' )
          string = value + ' mil'

        if ( app.lang == 'en' )
          string = new Intl.NumberFormat( app.lang ).format( value * 1000 )

        return string

      },

      "Vanished place population difference" : function() {

        let city = app.variables.result.vanishing_place
        let population = city.pop_2019
        let deaths = app.variables.initial.deaths
        let difference = deaths - population

        if ( difference < 1000 )
          return "approximately"

        let value = Math.round( difference / 1000 )
        let string

        if ( app.lang == 'pt-br' )
          string = value + ' mil'

        if ( app.lang == 'en' )
          string = new Intl.NumberFormat( app.lang ).format( value * 1000 )

        return string + ' less than'

      },

      "Update" : function() {

        let timestamp = app.variables.initial.date
        let noon = 'T12:00:00-03:00'
        let date =  new Date( timestamp + noon )

        let options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }

        let text = date.toLocaleDateString( app.lang, options )
        let markup = '<time datetime="' + timestamp + '">' + text + '</time>'

        return markup

      },

      "Update short" : function() {

        let timestamp = app.variables.initial.date
        let noon = 'T12:00:00-03:00'
        let date =  new Date( timestamp + noon )

        return date.toLocaleDateString( app.lang )

      }

    },

    update : function( list ) {

      list = list || Object.keys( app.variables.get )

      for ( let variable of list ) {

        for ( let element of app.variables.elements ) {

          if ( element.dataset.var == variable ) {

            let text = app.variables.get[ variable ]()
            element.innerHTML = text

          }

        }

      }

    },

    initialize : function() {

      let url = app.api + 'count'
      let options = { mode: 'cors' }

      fetch( url, options )
        .then( response => response.json() )
        .then( data => {

          if ( app.parameters.deaths )
            data.deaths = app.parameters.deaths

          app.variables.initial = data
          app.variables.update(
            [
              'Death count',
              'Update',
              'Vanished cities'
            ]
          )

        } )
        .catch( error => console.log( error ) )

    }

  },

  pages : {

    previous : 'main',

    open : function( name ) {

      app.pages.previous = JSON.parse( JSON.stringify( app.element.dataset.page ) )
      app.element.dataset.page = name

      if ( name == 'poster' ) {
        app.poster.initialize(
          app.variables.result.radius.today.inner_point,
          app.variables.result.radius.today.outer_point
        )
        window.poster.focus()
      }

      if ( name == 'poster' || name == 'main' )
        app.story.carousel.instance.keyboard.disable()

      if ( name == 'story' && app.pages.previous == 'poster' )
        app.story.carousel.instance.keyboard.enable()

      if ( name == 'story' )
        window.story.focus()

      gtag('event', 'view_page', {
        'event_category': 'engagement',
        'event_label': name,
      });

    },

    close : function() {

      app.element.dataset.page = app.pages.previous

    },

    initialize : function() {

      app.element.dataset.page = 'main'

    }

  },

  main : {

    element : document.querySelector( '.main' ),

    background : function() {

      if ( window.innerWidth >= 800 )
        return false

      document.querySelector( '.background' ).style.height = '0'

      setTimeout( function() {

        let height = ( app.main.element.scrollHeight - app.main.element.offsetHeight ) + 'px'
        document.querySelector( '.background' ).style.height = height

      }, 10 )

    },

    initialize : function() {

      app.main.background()

      window.addEventListener( 'resize', app.main.background )

    }

  },

  search : {

    form : {

      element : document.querySelector( 'form' ),

      initialize : function() {

        app.search.form.element.addEventListener( 'reset', function( event ) {

          app.search.suggestions.clear()

        } )

        app.search.form.element.addEventListener( 'submit', function( event ) {

          let suggestion = document.querySelector( '.suggestions ol li:first-child button' )

          if ( suggestion )
            suggestion.click()
          else
            app.search.input.identify()

          event.preventDefault()

        } )

      }

    },

    input : {

      sanitized : function() {

        return app.search.input.element.value.trim()

      },

      element : document.querySelector( 'input[type="search"]' ),

      debounce : {

        timer : undefined,

        function : function( callback, delay ) {

          delay = delay || 500

          clearTimeout( app.search.input.debounce.timer )

          app.search.input.debounce.timer = setTimeout( callback , delay )

        }

      },

      identify : function() {

        let api = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'

        let address = encodeURIComponent( app.search.input.sanitized() )

        if ( address ) {

          let url = ''

          url += api
          url += address
          url += '.json'
          url += '?'
          url += 'country=us,pr,as,gu,vi,mp,um'
          url += '&'
          url += 'language=en'
          url += '&'
          url += 'limit=3'
          url += '&'
          url += 'access_token='
          url += app.story.map.token
          
          //console.log( "URL for Geocoding API call", url)
          
          fetch( url )
            .then( response => response.json() )
            .then( data => app.search.suggestions.handle( data ) )
            .catch( error => console.error( error ) )

        }

        // gtag('event', 'search', {
        //   'event_category': 'engagement',
        //   'event_label': app.search.input.sanitized(),
        // });

      },

      initialize : function() {

        app.search.input.element.addEventListener( 'input', function() {

          let address = app.search.input.sanitized()

          if ( address )
            app.search.input.debounce.function( app.search.input.identify )
          else
            app.search.suggestions.clear()

        } )

        app.search.input.element.addEventListener( 'focus', function() {

          app.element.dataset.search = 'focus'

        } )

        app.search.input.element.addEventListener( 'blur', function() {

          app.element.dataset.search = 'blur'

        } )

      }

    },

    suggestions : {

      handle : function( data ) {

        //console.log("Response from Geocoding API", data)

        if ( data.features ) {

          for ( let feature of data.features ) {

            feature.primary = ''
            feature.secondary = ''
            feature.postcode = ''

            feature.primary += feature.address ? feature.address + ' ' : ''
            feature.primary += feature.text

            if ( feature.context ) {

              for ( let context of feature.context ) {

                feature.secondary += context.id.includes( 'poi'          ) ? ', ' + context.text : ''
                feature.secondary += context.id.includes( 'neighborhood' ) ? ', ' + context.text : ''
                feature.secondary += context.id.includes( 'locality'     ) ? ', ' + context.text : ''
                feature.secondary += context.id.includes( 'place'        ) ? ', ' + context.text : ''
                feature.secondary += context.id.includes( 'district'     ) ? ', ' + context.text : ''

                if ( context.id.includes( 'region' ) ) {

                  if ( 'short_code' in context )
                    feature.secondary += ', ' + context.short_code.replace( 'US-', '' )

                }

                if ( !feature.postcode )
                  feature.postcode += context.id.includes( 'postcode' ) ? ' ' + context.text : ''

              }

            }

            feature.secondary = feature.secondary.replace( /(^,\s*)/g, '' )
            feature.secondary += feature.postcode

          }

          app.search.suggestions.fill( data.features )

        }

      },

      fill : function( features ) {

        app.search.suggestions.clear()

        if ( features.length > 1 )
          app.element.dataset.suggestions = true

        if ( features.length === 0 )
          app.element.dataset.suggestions = null

        let ol = document.querySelector( '.suggestions ol' )

        for ( let feature of features ) {

          let item, button, primary, secondary

          item = document.createElement( 'li' )

          button = document.createElement( 'button' )
          button.setAttribute( 'type', 'button' )
          button.value = JSON.stringify( feature.center )

          button.addEventListener( 'click', function() {

            let center = JSON.parse( this.value )
            app.story.begin( center )

          } )

          primary = document.createElement( 'span' )
          primary.innerText = feature.primary

          secondary = document.createElement( 'span' )
          secondary.innerText = feature.secondary

          button.appendChild( primary )
          button.appendChild( secondary )
          item.appendChild( button )
          ol.appendChild( item )

        }

      },

      clear : function() {

        let ol = document.querySelector( '.suggestions ol' )

        let item = ol.lastElementChild

        while ( item ) {
            ol.removeChild(item)
            item = ol.lastElementChild
        }

        app.element.dataset.suggestions = false

      },

      initialize : function() {

      },

    },

    geolocation : {

      options : {
        enableHighAccuracy : false,
        maximumAge : 1000 * 60,
        timeout : 10000
      },

      success : function( position ) {

        if ( position.coords ) {

          let center = [
            position.coords.longitude,
            position.coords.latitude
          ]

          app.story.begin( center )

          gtag('event', 'geolocation', {
            'event_category': 'engagement',
            'event_label': 'success' // JSON.stringify( center )
          });

        }

      },

      error : function( error ) {

        gtag('event', 'geolocation', {
          'event_category': 'engagement',
          'event_label': 'error',
          'value': error.code
        });

        console.error( error.code, error.message )

        alert( app.error[ app.lang ][ 2 ] )

      },

      get : function() {

        if ( navigator.geolocation ) {

          // dummy one, which will result in a working next statement
          navigator.geolocation.getCurrentPosition(
            function () {},
            function () {},
            {}
          )

          navigator.geolocation.getCurrentPosition(
            app.search.geolocation.success,
            app.search.geolocation.error,
            app.search.geolocation.options
          )

        }

      },

      initialize : function() {

        if ( navigator.geolocation )
          app.element.dataset.geolocation = true
        else
          app.element.dataset.geolocation = false

      }

    },

    initialize : function() {

      app.search.form.initialize()
      app.search.input.initialize()
      app.search.suggestions.initialize()
      app.search.geolocation.initialize()

    }

  },

  story : {

    steps : {

      show : {

        "You are here" : function() {

          map[ app.story.map.transition() ]( {
            center : app.story.map.user,
            speed  : .1,
            zoom   : 15.5,
            pitch  : 0
          } )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( true )
          app.story.map.controls.bubble.toggle( false )


          for ( let index of Array( 2 ).keys() ) {

            let location, center, label;

            if ( index === 0 ) {

              center = app.story.map.user

              if ( app.lang == 'pt-br' )
                label = 'Você está aqui'

              if ( app.lang == 'en' )
                label = 'You are here'

            } else {

              location = app.variables.result.nearest_landmark
              center = location.radius.today.inner_point
              label = location.display_text.landmark

            }

            app.story.map.controls.marker.initialize(
              center,
              index,
              label
            )

            app.story.map.controls.marker.toggle( index > 0 ? false : true, index )
            app.story.map.controls.marker.toggleLabel( index > 0 ? false : true, index )

          }


          delete app.story.map.monitoring

          app.story.map.monitoring = setInterval( function() {

            if ( map.isStyleLoaded() && app.variables.result ) {

              (function() {

                app.story.map.controls.people.initialize()
                app.story.map.controls.people.toggle( { opacity: 1, radius: 1.5, color: '#555' } )
                app.story.map.controls.people.highlight.someInsideCircle.initialize( 94 )
                app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
                app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )

                for ( let key of ['intermediate_radius', 'full_radius', 'landmark_radius'] ) {

                  let radius =
                      key == 'intermediate_radius' ? app.variables.result.radius.first_stop
                    : key == 'full_radius'         ? app.variables.result.radius.today
                    :                                app.variables.result.nearest_landmark.radius.today;

                  app.story.map.controls.people.highlight.insideCircle.initialize(
                    radius.inner_point,
                    radius.outer_point,
                    key
                  )
                  app.story.map.controls.people.highlight.insideCircle.toggle( false, key)

                  app.story.map.controls.circle.initialize(
                    radius.inner_point,
                    radius.outer_point,
                    key
                  )
                  app.story.map.controls.circle.toggle( false, key )

                }

                app.story.map.controls.location.initialize( app.variables.result.vanishing_place.id )
                app.story.map.controls.location.toggle.highlight( false )
                app.story.map.controls.location.toggle.mask( false )

                setTimeout( app.story.map.controls.bubble.initialize, 1000 )

                app.element.dataset.loaded = true
                app.story.carousel.instance.keyboard.enable()

                clearInterval( app.story.map.monitoring )

              })()

            }

          }, 200 )

        },
        "First death" : function() {

          map[ app.story.map.transition() ]( {
            center : app.story.map.user,
            speed  : .1,
            zoom   : 17,
            pitch  : 60,
          } )

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#555' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( true, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "Following deaths" : function() {

          map[ app.story.map.transition() ]( {
            center : app.story.map.user,
            speed  : .1,
            zoom   : 16.75,
            pitch  : 60
          } )

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#555' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( true, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( true, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "After two months" : function() {

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen('intermediate_radius', 60 )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "All deaths" : function() {

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen('full_radius', 60 )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "All deaths with outline" : function() {

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( true )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( true, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen( 'full_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "City that would have vanished" : function() {

          let city = app.variables.result.vanishing_place

          //console.log("City vanished", city)

          app.story.map.controls.marker.toggle( false, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( true )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#333' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.location.fitOnScreen( city.bbox )
          app.story.map.controls.location.toggle.highlight( true )
          app.story.map.controls.location.toggle.mask( false )

        },
        "City vanished" : function() {

          let city = app.variables.result.vanishing_place

          app.story.map.controls.marker.toggle( false, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.location.fitOnScreen( city.bbox )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( true )

        },

        "Real distribution" : function() {

          app.story.map.controls.marker.toggle( false, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( true )
          app.story.map.controls.bubble.toggle( true )
          app.story.map.controls.people.toggle( { opacity: 0, radius: 1, color: '#555' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )
          app.story.map.controls.location.fitOnScreen( app.story.map.bbox.us )

        },

        "Nearest Landmark" : function() {

          let city = app.variables.result.nearest_landmark

          app.story.map.controls.location.fitOnScreen(
            city.bbox,
            true
          )

          app.story.map.controls.marker.toggle( false, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( true, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( true )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#555' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },
        "Nearest Landmark location" : function() {

          let city = app.variables.result.nearest_landmark

          app.story.map.controls.marker.toggle( false, 0 )
          app.story.map.controls.marker.toggleLabel( false, 0 )
          app.story.map.controls.marker.toggle( true, 1 )
          app.story.map.controls.marker.toggleLabel( true, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( false, 'full_radius' )
          app.story.map.controls.circle.toggle( true, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen( 'landmark_radius', 60, -38 )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },

        "Share me" : function() {

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( true, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( true )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( true, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen( 'full_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },

        "Related article" : function() {

          app.story.map.controls.marker.toggle( true, 0 )
          app.story.map.controls.marker.toggleLabel( true, 0 )
          app.story.map.controls.marker.toggle( false, 1 )
          app.story.map.controls.marker.toggleLabel( false, 1 )
          app.story.map.controls.marker.toggle( false, 2 )
          app.story.map.controls.marker.toggleLabel( false, 2 )

          app.poster.button.toggle( false )
          app.story.map.controls.labels.toggle( false )
          app.story.map.controls.bubble.toggle( false )
          app.story.map.controls.people.toggle( { opacity: 1, radius: 1, color: '#fff' } )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-death' )
          app.story.map.controls.people.highlight.someInsideCircle.toggle( false, 'first-deaths' )
          app.story.map.controls.people.highlight.insideCircle.toggle( true, 'full_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'landmark_radius' )
          app.story.map.controls.people.highlight.insideCircle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.toggle( true, 'full_radius' )
          app.story.map.controls.circle.toggle( false, 'landmark_radius' )
          app.story.map.controls.circle.toggle( false, 'intermediate_radius' )
          app.story.map.controls.circle.fitOnScreen( 'full_radius' )
          app.story.map.controls.location.toggle.highlight( false )
          app.story.map.controls.location.toggle.mask( false )

        },

      },

      handle : function() {

        let active = document.querySelector( '.swiper-slide-active' )

        if ( !active )
          active = document.querySelector( '.swiper-slide' )

        let step = active.dataset.step

        app.element.dataset.step = step
        app.story.steps.show[ step ]()

        gtag('event', 'view_item', {
          'event_category': 'engagement',
          'event_label': step,
        });

      }

    },

    map : {

      id : 'map',
      style : 'mapbox://styles/tiagombp/cketv7ns10nox19p031mkqjbc?optimize=true', // mapbox://styles/tiagombp/ckbz4zcsb2x3w1iqyc3y2eilr?optimize=true',
      token : 'pk.eyJ1IjoidGlhZ29tYnAiLCJhIjoiY2thdjJmajYzMHR1YzJ5b2huM2pscjdreCJ9.oT7nAiasQnIMjhUB-VFvmw',
      user : undefined,
      element : document.getElementById( 'map' ),

      bbox : {

        us : [
          [-129.549408, 21.999082],
          [-63.807220,  52.305120]
        ]

      },

      transition : function() {
        return app.browser.iOS() ? 'jumpTo' : 'flyTo'
      },

      radius : function( inner, outer ) {

        let feature = {}

        feature.inner = turf.helpers.point( inner )
        feature.outer = turf.helpers.point( outer)

        // calculate radius in miles
        feature.radius = turf.distance(
          feature.inner,
          feature.outer,
          {units: 'miles'}
        )

        return {
          center : feature.inner,
          miles : feature.radius
        }

      },

      reset : function() {

        app.story.carousel.instance.keyboard.disable()

        app.element.dataset.step   = false
        app.element.dataset.loaded = false
        app.element.dataset.poster = false

        if ( app.variables.result )
          delete app.variables.result

        if ( map ) {

          let layers = [
            'first-death',
            'first-deaths',
            'mask0',
            'mask1',
            'mask2',
            'circle0',
            'circle1',
            'circle2',
          ]

          for ( let layer of layers ) {

            if ( map.getLayer(  layer ) ) map.removeLayer(  layer )
            if ( map.getSource( layer ) ) map.removeSource( layer )

          }

          first_94 = undefined

          app.story.map.controls.marker.reset()

          map.remove()

          delete window.map

        }

      },

      padding : function() {

        let distance   = 8
        let base       = 100
        let width      = window.innerWidth
        let multiplier = width / base
        let pad        = distance * multiplier
        let nav        = document.querySelector( '.story nav' ).offsetHeight

        return {
          top:    Math.max( pad, nav ) + app.story.map.offset.value,
          bottom: pad                  + app.story.map.offset.value,
          left:   pad,
          right:  pad
        }

      },

      offset : {

        value : undefined,

        update : function() {

          let container = document.querySelector( '.steps-container' )
          let padding = parseFloat( window.getComputedStyle( container ).getPropertyValue( 'padding-bottom' ) )

          let steps = document.querySelector( '.steps' )
          let height = steps.offsetHeight

          let offset = Math.round( padding + height )

          if ( window.innerWidth >= 800 )
            offset = 0

          if ( app.story.map.offset.value !== offset ) {

            app.story.map.element.style.top = ( offset * -1 ) + 'px'
            app.story.map.offset.value = offset
            map.resize()

          }

        },

        initialize : function() {

          window.addEventListener( 'resize', function() {
            app.story.map.offset.update()
          } )

        }

      },

      initialize : function( center ) {

        mapboxgl.accessToken = app.story.map.token
        app.story.map.user = center

        app.story.map.reset()

        window.map = new mapboxgl.Map( {
          container: app.story.map.id,
          style:     app.story.map.style,
          center:    app.story.map.user,
          zoom:      19,
          pitch:     0,
          // interactive: app.browser.iOS() ? false : true
          // preserveDrawingBuffer: true
        } )

        map.setMinZoom( 2 )
        map.setMaxZoom( 19 )
        map.keyboard.disable()
        map.dragRotate.disable()
        map.touchZoomRotate.disableRotation()

        console.log(app.story.map.user);

        let url = app.api

        if ( app.parameters.deaths )
          url += 'coords_deaths'
        else
          url += 'coords'

        url += '?'
        url += 'lat=' + app.story.map.user[ 1 ]
        url += '&'
        url += 'lon=' + app.story.map.user[ 0 ]

        if ( app.parameters.deaths ) {
          url += '&'
          url += 'deaths=' + app.parameters.deaths
        }

        let options = { mode : 'cors' }

        fetch( url, options )
          .then( response => response.json() )
          .then( data => {

            //console.log("Response from Backend API ", data);

            if ( data.error ) {

              alert( app.error[ app.lang ][ data.error ] )
              app.pages.open( 'main' )
              return false

            }

            app.variables.result = data
            app.element.dataset.wouldVanish =
              data.user_county.id == data.vanishing_place.id

            app.variables.update()
            app.story.steps.handle()
            app.story.map.offset.initialize()

          } )
          .catch( error => console.log( error ) )

      },

      controls : {

        bubble : {

          toggle : function( option ) {

            let opacity = option ? .8 : 0;

            if ( map.getLayer( 'actual_deaths' ) )
              map.setPaintProperty( 'actual_deaths', 'circle-opacity', opacity )

          },

          initialize : function() {

            if ( map.getLayer( 'actual_deaths' ) || map.getSource( 'mun_deaths' ) )
              return false

            let path = document.documentElement.getAttribute( 'path' )
            let update = '?update=' + app.variables.initial.date

            fetch( path + 'data/deaths.json' + update )
            	.then(response => response.json())
            	.then(function(data_deaths_centroids) {

            		let max_deaths = data_deaths_centroids.features
            			.map(d => d.properties.deaths)
            			.reduce((max, current_value) =>
            				max >= current_value ?
            				max :
            				current_value
            			);

                if ( !map.getSource( 'mun_deaths' ) ) {

              		map.addSource('mun_deaths', {
              			'type': 'geojson',
              			'data': data_deaths_centroids
              		});

                }

                if ( !map.getLayer( 'actual_deaths' ) ) {

              		map.addLayer({
              			'id': 'actual_deaths',
              			'type': 'circle',
              			'source': 'mun_deaths',
              			'paint': {
              				'circle-color': app.color( 'light-100' ),
              				'circle-opacity': 0,
              				'circle-radius': [
              					'let',
              					'sqrt_deaths',
              					['sqrt', ['get', 'deaths']],

              					[
              						'interpolate',
              						['linear'],
              						['var', 'sqrt_deaths'],
                          0, 0,
              						1, 1,
              						Math.sqrt(max_deaths), Math.min( ( window.innerWidth / 50 ), 15 )
              					]
              				]
              			}
              		})
                }

            	});
          }

        },

        marker : {

          list : [],

          reset : function() {

            for ( let marker of document.querySelectorAll( '.story .marker' ) )
              marker.remove()

            app.story.map.controls.marker.list = []

          },

          toggle : function( option, index ) {

            let opacity = option ? 1 : 0;

            let marker = app.story.map.controls.marker.list[ index ]

            if ( marker )
              marker.style.opacity = opacity

          },

          toggleLabel : function( option, index ) {

            let marker = app.story.map.controls.marker.list[ index ]

            if ( marker )
              marker.dataset.label = option

          },

          initialize : function( center, index, label = '' ) {

            if ( app.story.map.controls.marker.list[ index ] )
              return false

            let marker = document.createElement( 'div' )
            marker.classList.add( 'marker' )
            marker.dataset.labelIndex = index
            marker.dataset.labelContent = label
            marker.dataset.label = false

            new mapboxgl.Marker(
              {
                element : marker,
                anchor: index === 0 ? 'center' : 'bottom'
              }
            )
            .setLngLat( center )
            .addTo( map )

            app.story.map.controls.marker.list[ index ] = marker

          }

        },

        labels : {

          element : document.querySelector( '[name="labels"][type="checkbox"]' ),

          opacity : function( option ) {

            const layers = [
              'country-label',
              'state-label',
              'settlement-major-label',
              'settlement-minor-label',
              'settlement-subdivision-label',
              'natural-point-label',
              'poi-label',
              'water-point-label',
              'road-label',
              'waterway-label',
              'airport-label',
              'natural-line-label',
            ]

            let opacity = option ? 1 : 0

            for ( layer of layers ) {

              if ( map.getLayer( layer ) )
                map.setPaintProperty( layer, 'text-opacity', opacity )

            }

            map.setPaintProperty( 'airport-label', 'icon-opacity', opacity )

          },

          toggle : function( option ) {

            app.story.map.controls.labels.element.checked = option
            app.story.map.controls.labels.opacity( option )

          },

          initialize : function() {

            app.story.map.controls.labels.element.addEventListener( 'change', function() {

              app.story.map.controls.labels.opacity( this.checked )

            } )

          }

        },

        circle : {

          list : {
            'intermediate_radius' : null,
            'full_radius'         : null,
            'landmark_radius'     : null
          },

          reset : function () {

            let list = app.story.map.controls.circle.list

            for ( let key of Object.keys(list) )
              app.story.map.controls.circle.toggle( false, key )

            list = {}//Object.keys(list).forEach(key => list[key] = null)

          },

          toggle : function( option, key ) {

            let opacity = option ? 1 : 0;
            let name = 'circle' + key

            if ( map.getLayer( name ) )
              map.setPaintProperty( name, 'fill-opacity', opacity )

          },

          initialize : function( inner, outer, key ) {

            app.story.map.controls.circle.reset()

            let name = 'circle' + key

            if ( map.getLayer( name ) )
              return false

            let radius = app.story.map.radius(
              inner,
              outer
            )

            let circle = turf.circle(
              radius.center,
              radius.miles,
              {units: 'miles'}
            )

            map.addSource(
            	name,
              {
            		'type': 'geojson',
            		'data': circle
            	}
            )

            map.addLayer(
              {
              	'id': name,
              	'type': 'fill',
              	'source': name,
              	'layout': {},
              	'paint': {
              		'fill-outline-color': app.color( 'highlight' ),
              		'fill-color': 'transparent',
              		'fill-opacity': 0
              	}
              }
            )

            app.story.map.controls.circle.list[ key ] = circle

            app.story.map.controls.circle.list[ key ]

          },

          fitOnScreen : function( key, pitch = 0, bearing = 0 ) {

            let circle = app.story.map.controls.circle.list[ key ]

          	let bbox = turf.bbox( circle )

          	map.fitBounds(
              bbox,
              {
                animate: app.browser.iOS() ? false : true,
                padding: app.story.map.padding(),
                duration: 6000,
                pitch: pitch,
                bearing: bearing
          	  }
            )

          }

        },

        people : {

          toggle : function( options ) {

            for ( let [ property, value ] of Object.entries( options ) ) {

              map.setPaintProperty(
                'people',
                'circle-' + property,
                value
              )

            }

          },

          initialize : function() {
            map.setPaintProperty(
              'people',
              'circle-opacity',
              1
            )
            map.setPaintProperty(
              'people',
              'circle-radius',
              1
            )
            map.setPaintProperty(
              'people',
              'circle-color',
              '#555'
            )

            map.moveLayer("people", "national-park")

          },

          highlight : {

            insideCircle : {

              list : {
                'intermediate_radius' : null,
                'full_radius'         : null,
                'landmark_radius'     : null
              },

              reset : function() {

                let list = app.story.map.controls.people.highlight.insideCircle.list

                for ( let key of Object.keys(list) )
                  app.story.map.controls.people.highlight.insideCircle.toggle( false, key )

              },

              toggle : function( option, key ) {

                let opacity = option ? .75 : 0
                let name = 'mask' + key

                if ( map.getLayer( name ) )
                  map.setPaintProperty( name, 'fill-opacity', opacity )

              },

              initialize : function( inner, outer, key ) {

                app.story.map.controls.people.highlight.insideCircle.reset()

                let name = 'mask' + key

                if ( map.getLayer( name ) )
                  return false

                let radius = app.story.map.radius( inner, outer )

                let circle = turf.circle(
                  radius.center,
                  radius.miles,
                  {units: 'miles'}
                )

                let mask = turf.mask( circle )

                map.addSource( name, {
                  'type': 'geojson',
                  'data': mask
                });

                map.addLayer({
                  'id': name,
                  'type': 'fill',
                  'source': name,
                  'paint': {
                    'fill-color': app.color( 'dark-100' ),
                    'fill-opacity': 0
                  }
                });

                map.moveLayer( name, 'road-label')

              }

            },

            someInsideCircle : {

              toggle : function( option, name ) {

                let opacity = option ? 1 : 0;
                map.setPaintProperty( name, 'circle-opacity', opacity );

              },

              initialize : function( amount ) {

                if ( map.getLayer( name ) )
                  return false

                let first_94;
                let first_94_len = 0;

                let center = app.story.map.user;
                let center_pt = turf.helpers.point(center);

                let tries = 0;
                let radiuses = [0.075, 0.1, 0.15, 0.2, 0.25, 0.5, 1, 2.5];

                let features_to_avoid = map.queryRenderedFeatures({
              		layers: ["water", "landuse", "national-park"]
              	});

                while (first_94_len < amount) {

                  // defines the circle for this iteration
                  let radius = radiuses[tries];

                  // console.log("looping, try: ", tries, ", radius: ", radius);

                  let circle = turf.circle(center_pt, radius);
                  let bboxCircle = turf.bbox(circle);

                  let livable_circle;

                  if (features_to_avoid.length > 1) {

                    let features_to_avoid_pol = turf.union(...features_to_avoid);
                    livable_circle = turf.difference(circle, features_to_avoid_pol);
                    if (!livable_circle) {
                      // in this case, all the circle area is unlivable, so increase de radius
                      // and jump to the next iteration
                      tries ++
                      continue
                    };

                  } else livable_circle = circle;

                  // generates points in the iteration's circle bbox
                  let random_points = turf.random.randomPoint(100, {
                    bbox: bboxCircle
                  });

                  // get points inside of livable circle
                  let inside_points = turf.pointsWithinPolygon(random_points, livable_circle);

                  // test if there were any, and updates the points collected so far
                  if (inside_points) {
                    if (first_94) {
                      first_94.features = [...first_94.features, ...inside_points.features]
                    } else first_94 = inside_points;
                  }

                  first_94_len = first_94.features.length;

                  // console.log("Quantidade até agora ", first_94_len, first_94);

                  // test if we got the amount needed, then break. else, increase circle radius and repeat.
                  if (first_94_len >= amount) {
                    first_94.features = [...first_94.features].slice(0, amount);
                    // console.log("Opa, chegou. ", first_94);
                    break
                  }

                  tries ++

                  // edge cases scenario: if couldn't generate 94 points in liveable areas in
                  // a 2.5km radius, just place the rest anywhere, regardless if in liveable area or not
                  if (tries > radiuses.length - 1) {
                    //console.log("Não deu, vai em qq lugar.")
                    let any_random_points = turf.random.randomPoint(amount - first_94_len, {bbox: bboxCircle});
                    first_94.features = [...first_94.features, ...any_random_points.features];
                    break;
                  }
                }

                // build first death object from the first 94 deaths object

                let first = { ... first_94 };
                first.features = [...first_94.features].slice(0,1);

                let data = {
                  'first-death' : first,
                  'first-deaths': first_94
                }

                //console.log(data);

                for (name of ['first-death', 'first-deaths']) {
                  if (!map.getLayer( name )) {
                    map.addSource( name , {
                      'type': 'geojson',
                      'data': data[name]
                    });

                    map.addLayer({
                      'id': name,
                      'type': 'circle',
                      'source': name,
                      'paint': {
                        'circle-radius': 3,
                        'circle-color': app.color( 'light-100' ),
                        'circle-opacity': 0
                      }
                    },
                    'road-label');
                  } else {

                    map.getSource(name).setData(data[name]);
                  }
                }

              }

            }

          }

        },

        location : {

          load : function() {

            if ( !map.getSource( app.tilesets.places.source ) ) {

              map.addSource(
                app.tilesets.places.source,
                {
                  'type' : 'vector',
                  'url' : app.tilesets.places.url
                }
              )

            }

            if ( !map.getLayer ( 'places' ) ) {

              map.addLayer({
                  'id': 'places',
                  'type': 'fill',
                  'source': app.tilesets.places.source,
                  'source-layer': app.tilesets.places.layer,
                  'paint': {
                      'fill-opacity' : 0,
                      'fill-outline-color' : 'transparent',
                      'fill-color' : 'transparent'
                  }
              },
              'road-label');

            }

            if ( !map.getSource( app.tilesets.counties.source ) ) {

              map.addSource(
                app.tilesets.counties.source,
                {
                  'type' : 'vector',
                  'url' : app.tilesets.counties.url
                }
              )

            }

            if ( !map.getLayer ( 'counties' ) ) {

              map.addLayer({
                  'id': 'counties',
                  'type': 'fill',
                  'source': app.tilesets.counties.source,
                  'source-layer': app.tilesets.counties.layer,
                  'paint': {
                      'fill-opacity' : 0,
                      'fill-outline-color' : 'transparent',
                      'fill-color' : 'transparent'
                  }
              },
              'road-label');

            }

          },

          fitOnScreen : function( bbox, ) {

            map.fitBounds(
              bbox, {
                animate: app.browser.iOS() ? false : true,
                linear: false,
                speed: 1,
                padding: app.story.map.padding(),
                pitch: 0
              });

            map.once( 'idle', function() {

              app.story.map.controls.location.mask()

            } )

          },

          toggle : {

            highlight : function( option ) {

              let opacity = option ? .33 : 0;

              if ( map.getLayer( 'location_highlight' ) )
                map.setPaintProperty( 'location_highlight', 'fill-opacity', opacity )

            },

            mask : function( option ) {

              app.story.map.controls.location.visibility.mask = option ? true : false

              let opacity = option ? .75 : 0;

              if ( map.getLayer( 'location-mask' ) )
                map.setPaintProperty( 'location-mask', 'fill-opacity', opacity )

            },

          },

          visibility : {

            mask : false,

          },

          reset : function() {

            if ( map.getLayer(  'location_highlight' ) ) map.removeLayer(  'location_highlight' )
            if ( map.getSource( 'location_highlight' ) ) map.removeSource( 'location_highlight' )
            if ( map.getLayer( 'location-mask' ) ) map.removeLayer( 'location-mask' )
            if ( map.getSource( 'location-mask' ) ) map.removeSource( 'location-mask' )

          },

          highlight : function( code ) {

            let wouldVanish = app.element.dataset.wouldVanish === "true";

            let geography = (wouldVanish ? 'counties' : 'places');

          	map.addLayer( {
          			'id': 'location_highlight',
          			'type': 'fill',
          			'source': app.tilesets[geography].source,
          			'source-layer': app.tilesets[geography].layer,
          			'paint': {
          				'fill-opacity': 0,
          				'fill-color': app.color( 'highlight' )
          			},
          			'filter': ['==', app.tilesets[geography].id, '']
          		},
          		'road-label');

            map.setFilter(
            	'location_highlight', [
            		'==',
            		['get', app.tilesets[geography].id],
            		code
              ]);

          },

          mask : function( code ) {

            let wouldVanish = app.element.dataset.wouldVanish === "true";
            let geography = (wouldVanish ? 'counties' : 'places');
            let property_name = app.tilesets[geography].id;

            code = code || app.story.map.controls.location.code

            let places = map.querySourceFeatures(
              app.tilesets[geography].source,
              {
                sourceLayer: app.tilesets[geography].layer
              }
            );

            let features = places.filter(d => d.properties[property_name] == code)

            if ( features.length ) {

              console.log( 'Found the city’s polygon' )

              if (!map.getSource('location-mask')) {

                let polygon = turf.union(...features);
                let world_bbox = turf.bboxPolygon( [ -180, -90, 180, 90 ] );
                //let mask = turf.mask( polygon );
                let mask = turf.difference(world_bbox, polygon);


                map.addSource('location-mask', {
                    'type': 'geojson',
                    'data': mask
                });

                map.addLayer({
                    'id': 'location-mask',
                    'type': 'fill',
                    'source': 'location-mask',
                    'paint': {
                        'fill-color': app.color( 'dark-100' ),
                        'fill-opacity': 0,
                        'fill-outline-color': app.color( 'highlight' )
                    }
                },
                'road-label');

                app.story.map.controls.location.toggle.mask(
                  app.story.map.controls.location.visibility.mask
                )

              }

            }

          },

          initialize : function( code ) {

            app.story.map.controls.location.code = code

            app.story.map.controls.location.reset()
            app.story.map.controls.location.load()
            app.story.map.controls.location.highlight( code )
            // app.story.map.controls.location.mask( code )

          },

        }

      }

    },

    begin : function( center ) {

      if ( app.story.carousel.instance )
        app.story.carousel.instance.destroy()

      app.story.carousel.initialize()

      app.pages.open( 'story' )
      app.story.map.initialize( center )

      app.search.suggestions.clear()
      app.search.form.element.reset()
      app.search.input.element.blur()

      app.story.carousel.instance.update()

      app.poster.reset()

      // gtag('event', 'view_search_results', {
      //   'event_category': 'engagement',
      //   'event_label': JSON.stringify( center ),
      // });

    },

    carousel : {

      instance : undefined,

      selector : '.swiper-container',

      options : {

        pagination: {
          el: '.swiper-pagination',
          type: 'progressbar',
        },

        navigation: {
          prevEl: '.prev',
          nextEl: '.next',
        },

        grabCursor: true,

        on: {

          init : function () {
            setTimeout( app.story.map.offset.update, 100 )
          },

          slideChangeTransitionEnd: function () {
            app.story.steps.handle()
          }

        }

      },

      initialize : function() {

        app.story.carousel.instance = new Swiper(
          app.story.carousel.selector,
          app.story.carousel.options
        )

      }

    },

    initialize : function() {

      app.story.map.controls.labels.initialize()

    }

  },

  poster : {

    element : document.querySelector( '.poster' ),

    placeholder : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    atelie : {

      element : document.querySelector( '.atelie' ),

      convert : function() {

        let options = {
          backgroundColor : app.color( 'dark-100' )
        }

        html2canvas( app.poster.atelie.html.element, options )
          .then( canvas => {

            console.log( canvas )

            app.poster.atelie.element.appendChild( canvas )

            let url = canvas.toDataURL( app.poster.map.type )

            app.poster.preview.update( url )
            app.poster.button.update( url )



          } )

      },

      html : {

        element : document.querySelector( '.poster-html' ),

        map : {

          element : document.querySelector( '.poster-map' ),

          reset : function() {

            let map = app.poster.atelie.html.map.element
            map.src = app.poster.placeholder

          },

          update : function( url ) {

            let map = app.poster.atelie.html.map.element

            map.crossOrigin = 'Anonymous'
            map.addEventListener( 'load', app.poster.atelie.convert, { once : true } )
            map.src = url

          }

        }

      },

      canvas : {

        reset : function() {

          let canvas = document.querySelector( '.atelie canvas' )

          if ( canvas )
            canvas.remove()

        },

      }

    },

    preview : {

      element : document.querySelector( '.poster-preview' ),

      reset : function() {

        app.poster.preview.update( app.poster.placeholder )

      },

      update : function( url ) {

        app.poster.preview.element.src = url

      }

    },

    image : {

      get : {

        url : function ( image ) {

          const canvas = document.createElement( 'canvas' )
          const ctx = canvas.getContext( '2d' )

          canvas.width = app.poster.map.size
          canvas.height = app.poster.map.size

          ctx.drawImage( image, 0, 0 )
          return canvas.toDataURL( app.poster.map.type )

        }

      }

    },

    map : {

      element : document.querySelector( '.poster-map' ),

      type : 'image/jpeg',
      size : 640,

      handle : function() {

        console.log( this )

        let url = app.poster.image.get.url( this )

        app.poster.atelie.html.map.update( url )

      },

      initialize : function( inner, outer ) {

        let radius = app.story.map.radius(
          inner,
          outer
        )

        let circle = turf.circle(
          radius.center,
          radius.miles,
          {units: 'miles'}
        )

        let offset = turf.circle(
          radius.center,
          radius.miles,
          {units: 'miles'}
        )

        let bbox = turf.bbox( offset )
        let bounds = turf.bboxPolygon( bbox )

        bounds.properties = {
          'fill': 'transparent',
          'stroke-width': 0
        }

        let overlay = JSON.stringify( bounds )

        let layers = [
          {
            "id" : "people-overlay",
            "type" : "circle",
            "source" : "composite",
            "source-layer" : "people",
            "paint": {
              "circle-color" : "white",
              "circle-radius" : 1
            }
          }
        ]

        let url = 'https://api.mapbox.com/styles/v1/tiagombp/ckf4vguv51dqd19pcs47xms69/static/'

        url += 'geojson(' + overlay + ')'
        url += '/auto/'
        url += app.poster.map.size + 'x' + app.poster.map.size
        url += '?'
        url += 'access_token=' + app.story.map.token
        url += '&'
        url += 'addlayer=' + JSON.stringify( layers[ 0 ] )
        url += '&'
        url += 'before_layer=national-park'

        url = encodeURI( url )

        let map = new Image

        map.crossOrigin = 'Anonymous'
        map.addEventListener( 'load', app.poster.map.handle )
        map.src = url;

        //console.log( "URL for static image call", url )

      }

    },

    button : {

      element : document.getElementById( 'download' ),

      toggle : function( option ) {

        option = option !== undefined ? option : false
        app.element.dataset.poster = option

      },

      reset : function() {

        app.poster.button.element.removeAttribute( 'href' )

      },

      update : function( url ) {

        app.poster.button.element.addEventListener( 'click', function() {

          gtag('event', 'share', {
            'event_category': 'engagement',
            'event_label': 'image',
          });

        } )

        app.poster.button.element.href = url
        app.poster.element.dataset.current = app.poster.element.dataset.loading

      }

    },

    reset : function() {

      app.poster.preview.reset()
      app.poster.atelie.html.map.reset()
      app.poster.atelie.canvas.reset()
      app.poster.button.reset()

    },

    initialize : function( inner, outer ) {

      if ( app.poster.element.dataset.current == JSON.stringify( inner ) )
        return false
      else
        app.poster.element.dataset.loading = JSON.stringify( inner )

      // load html2canvas script here

      app.poster.map.initialize( inner, outer )

    }

  },

  triggers : {

    elements : document.querySelectorAll( '[data-trigger]' ) ,

    initialize : function() {

      for ( let trigger of app.triggers.elements ) {

        trigger.addEventListener( 'click', function() {

          let instructions = this.dataset.trigger

          let f = new Function( instructions )

          return( f() )

        } )

      }

      /* disables camera icon
      document.querySelector( '.next' ).addEventListener( 'click', function() {

        if ( this.classList.contains( 'swiper-button-disabled' ) )
          app.pages.open('poster')

      } )
      */

    }

  },

  initialize : function() {

    app.parameters.initialize()
    app.variables.initialize()
    app.pages.initialize()
    app.main.initialize()
    app.search.initialize()
    app.story.initialize()
    app.triggers.initialize()

    if ( app.parameters.center )
      app.story.begin( app.parameters.center )

  }

}

app.initialize()
