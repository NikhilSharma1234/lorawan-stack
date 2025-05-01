// Copyright © 2025 The Things Network Foundation, The Things Industries B.V.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback, useLayoutEffect, useRef } from 'react'
import classnames from 'classnames'

import PropTypes from '@ttn-lw/lib/prop-types'
import combineRefs from '@ttn-lw/lib/combine-refs'

import style from './horizontal-scroll-fader.styl'

// HorizontalScrollFader is a component that fades out the content of a container when it
// is scrolled. It is used for scrollable elements that need some visual
// indication that they are scrollable, but do not have a scrollbar.
// The indication only shows when the content is scrolled.
const HorizontalScrollFader = React.forwardRef(
  ({ children, className, fadeWidth, light, faderWidth, leftFaderOffset }, ref) => {
    const wrapperRef = useRef(null)
    const combinedRef = combineRefs([ref, wrapperRef])

    // We'll attach a ref to the child's DOM node (the real scroll container).
    const scrollContainerRef = useRef(null)

    // Expect exactly one child that will be the scroll container:
    // - We clone it to attach our ref and ensure overflow is set
    let childElement = React.Children.only(children)

    childElement = React.cloneElement(childElement, {
      ref: scrollContainerRef,
    })

    const handleScroll = useCallback(() => {
      const scrollEl = scrollContainerRef.current
      if (!scrollEl) return

      const { scrollLeft, scrollWidth, clientWidth } = scrollEl
      const scrollable = scrollWidth - clientWidth

      // The fade divs are in the parent wrapper
      const wrapperEl = wrapperRef.current
      if (!wrapperEl) return

      const scrollGradientLeft = wrapperEl.querySelector(`.${style.scrollGradientLeft}`)
      const scrollGradientRight = wrapperEl.querySelector(`.${style.scrollGradientRight}`)

      // Left fade
      if (scrollGradientLeft) {
        // Opacity from 0 → 1 as we scroll away from the left edge
        const leftOpacity = scrollLeft < fadeWidth ? scrollLeft / fadeWidth : 1
        scrollGradientLeft.style.opacity = leftOpacity
      }

      // Right fade
      if (scrollGradientRight) {
        // Start fading out near the right edge (scrollLeft > scrollable - fadeWidth)
        const scrollEnd = scrollable - fadeWidth
        const rightOpacity = scrollLeft < scrollEnd ? 1 : (scrollable - scrollLeft) / fadeWidth
        scrollGradientRight.style.opacity = rightOpacity
      }
    }, [fadeWidth])

    useLayoutEffect(() => {
      const scrollEl = scrollContainerRef.current
      if (!scrollEl) return

      // Initial calculation
      handleScroll()

      // Recalculate on content changes
      const mutationObserver = new MutationObserver(() => {
        handleScroll()
      })
      mutationObserver.observe(scrollEl, { childList: true, subtree: true })

      scrollEl.addEventListener('scroll', handleScroll)
      window.addEventListener('resize', handleScroll)

      return () => {
        mutationObserver.disconnect()
        scrollEl.removeEventListener('scroll', handleScroll)
        window.removeEventListener('resize', handleScroll)
      }
    }, [handleScroll])

    return (
      <div ref={combinedRef} className={className} style={{ position: 'relative' }}>
        {/* The real scrollable child */}
        {childElement}

        {/* Left fade */}
        <div
          className={classnames(style.scrollGradientLeft, {
            [style.scrollGradientLeftLight]: light,
          })}
          style={{
            left: leftFaderOffset,
            width: faderWidth,
          }}
        />

        {/* Right fade */}
        <div
          className={classnames(style.scrollGradientRight, {
            [style.scrollGradientRightLight]: light,
          })}
          style={{
            width: faderWidth,
          }}
        />
      </div>
    )
  },
)

HorizontalScrollFader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  fadeWidth: PropTypes.number,
  faderWidth: PropTypes.string,
  leftFaderOffset: PropTypes.string,
  light: PropTypes.bool,
}

HorizontalScrollFader.defaultProps = {
  className: undefined,
  fadeWidth: 40,
  faderWidth: '1rem',
  leftFaderOffset: '0',
  light: false,
}

export default HorizontalScrollFader
