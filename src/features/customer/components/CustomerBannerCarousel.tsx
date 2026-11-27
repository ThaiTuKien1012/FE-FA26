import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Leaf, Pause, Play } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { WELCOME_BANNER } from '../data/customerBanners';
import type { BannerSlide, HomeProduct } from '../customerHomeModel';
import { BANNER_INTERVAL_MS, useBannerCarousel } from '../hooks/useBannerCarousel';
import { containerClass } from './CustomerCommerce';
import { CustomerStoreLogo } from './CustomerStoreLogo';

interface Props {
  slides: BannerSlide[];
  featuredProduct?: HomeProduct;
  onBrowseProducts: () => void;
  onBrowseStores: () => void;
  onShopStore: (storeSlug: string) => void;
  onOpenProduct: (product: HomeProduct) => void;
}

export function CustomerBannerCarousel({ slides, featuredProduct, onBrowseProducts, onBrowseStores, onShopStore, onOpenProduct }: Props) {
  // A Store banner that fails to load falls back to the decorative artwork of its slide.
  const [failedBanners, setFailedBanners] = useState<ReadonlySet<string>>(new Set());
  const carousel = useBannerCarousel(slides.length);
  const { index, playing, paused, reducedMotion, rootRef, cycle, goTo } = carousel;
  const activeIndex = Math.min(index, slides.length - 1);
  const active = slides[activeIndex];
  const accent = active.kind === 'store' ? active.art.accent : WELCOME_BANNER.accent;
  const duration = reducedMotion ? 0 : 0.65;

  return (
    <section
      ref={rootRef}
      id="customer-banner-home"
      role="region"
      aria-roledescription="carousel"
      aria-label="Bộ sưu tập nổi bật"
      tabIndex={0}
      className={`fm-hero h-[clamp(390px,32vw,440px)] max-[800px]:h-[400px] ${containerClass} relative isolate touch-pan-y overflow-hidden rounded-[18px] max-[580px]:h-[460px] max-[580px]:rounded-[13px] max-[360px]:h-[450px]`}
      onMouseEnter={carousel.onMouseEnter}
      onMouseLeave={carousel.onMouseLeave}
      onFocusCapture={carousel.onFocus}
      onBlurCapture={carousel.onBlur}
      onPointerDown={carousel.onPointerDown}
      onPointerUp={carousel.onPointerUp}
      onPointerCancel={carousel.onPointerCancel}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          goTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          goTo(event.key === 'Home' ? 0 : slides.length - 1);
        }
      }}
    >
      <h1 id="fm-hero-title" className="sr-only">{APP_BRAND.name} — Sản phẩm từ các cửa hàng quanh bạn</h1>
      <div aria-live={playing ? 'off' : 'polite'} aria-atomic="false" className="absolute inset-0">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === activeIndex;
          const contentMotion = {
            animate: { opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 },
            transition: { duration, delay: isActive && !reducedMotion ? 0.13 : 0, ease: 'easeOut' as const },
          };
          const shell = {
            'data-banner-id': slide.id, role: 'group', 'aria-roledescription': 'slide',
            'aria-label': `${slideIndex + 1} of ${slides.length}: ${slide.label}`, 'aria-hidden': !isActive, inert: !isActive,
            initial: false, animate: { opacity: isActive ? 1 : 0, x: isActive || reducedMotion ? 0 : 24 },
            transition: { duration, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
            className: 'absolute inset-0 overflow-hidden',
          } as const;
          if (slide.kind === 'store') {
            const { art } = slide;
            const ownBanner = slide.bannerUrl !== null && !failedBanners.has(slide.id);
            const imageSrc = ownBanner ? slide.bannerUrl! : art.image;
            return (
              <motion.article key={slide.id} {...shell}
                style={{ backgroundColor: art.background, color: art.ink, zIndex: isActive ? 2 : 1, pointerEvents: isActive ? 'auto' : 'none' }}>
                <div className={`absolute inset-0 max-[580px]:top-[52%] ${ownBanner ? 'left-[38%] max-[580px]:left-0' : ''}`}>
                  <motion.img
                    src={imageSrc}
                    alt={ownBanner ? `Ảnh bìa ${slide.storeName}` : ''}
                    data-banner-source={ownBanner ? 'store' : 'art'}
                    onError={() => { if (ownBanner) setFailedBanners(current => new Set(current).add(slide.id)); }}
                    initial={false}
                    animate={{ scale: isActive && playing && !reducedMotion ? 1.035 : 1 }}
                    transition={{ duration: isActive && playing && !reducedMotion ? BANNER_INTERVAL_MS / 1000 : reducedMotion ? 0 : 0.35, ease: 'linear' }}
                    className="size-full object-cover object-right"
                    loading={slideIndex <= 1 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                  {ownBanner
                    ? <div className="absolute inset-0 max-[580px]:hidden" style={{ background: `linear-gradient(90deg, ${art.background}, transparent 38%)` }} />
                    : <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff20,transparent_55%)] max-[580px]:hidden" />}
                  <div className="absolute inset-x-0 top-0 hidden h-12 max-[580px]:block" style={{ background: `linear-gradient(${art.background}, transparent)` }} />
                </div>
                <motion.div {...contentMotion} className="absolute top-1/2 left-12 z-1 w-[46%] -translate-y-[58%] max-[1100px]:left-8 max-[800px]:left-7 max-[800px]:w-[49%] max-[580px]:inset-x-6 max-[580px]:top-6 max-[580px]:w-auto max-[580px]:translate-y-0 max-[360px]:inset-x-5 max-[360px]:top-5">
                  <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/65 bg-white/65 py-1 pr-3 pl-1 shadow-[0_3px_15px_#172c1805] backdrop-blur-sm max-[800px]:mb-3 max-[580px]:mb-3">
                    <CustomerStoreLogo store={{ iconUrl: slide.iconUrl, name: slide.storeName }} className="size-6 rounded-full" /><span className="truncate text-[10px] font-medium max-[580px]:text-[9px]">{slide.storeName}</span>
                  </div>
                  <p className="text-[9px] font-semibold tracking-[1.7px] opacity-65 max-[800px]:text-[7px] max-[580px]:text-[7px] max-[580px]:tracking-[1.3px]">CỬA HÀNG TRÊN {APP_BRAND.name.toUpperCase()}</p>
                  <h2 className="mt-3 line-clamp-3 text-[49px] leading-[1.08] font-[650] tracking-[-1.8px] max-[1100px]:text-[42px] max-[800px]:text-[33px] max-[580px]:mt-3 max-[580px]:text-[34px] max-[580px]:tracking-[-1.3px] max-[360px]:text-[29px]">
                    {slide.storeName}
                  </h2>
                  <p className="mt-4 max-w-[310px] text-xs leading-[1.8] opacity-75 max-[800px]:mt-3 max-[800px]:text-[10px] max-[580px]:mt-3 max-[580px]:max-w-[290px] max-[580px]:text-[11px] max-[360px]:text-[10px]">Xem sản phẩm và gói sản phẩm của cửa hàng.</p>
                  <button onClick={() => onShopStore(slide.storeSlug)} className="mt-5 inline-flex items-center gap-5 rounded-full py-1.5 pr-1.5 pl-4 text-[11px] font-medium text-white hover:brightness-110 max-[580px]:mt-4 max-[580px]:text-[10px]" style={{ backgroundColor: art.accent }}>Đến cửa hàng<span className="grid size-7 place-items-center rounded-full bg-white/95 max-[580px]:size-6" style={{ color: art.accent }}><ArrowUpRight size={16} /></span></button>
                </motion.div>
              </motion.article>
            );
          }
          return (
            <motion.article key={slide.id} {...shell} style={{ backgroundColor: '#d9f1e5', color: '#073b30', zIndex: isActive ? 2 : 1, pointerEvents: isActive ? 'auto' : 'none' }}>
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(172deg,#11745e_0%,#28967b_22%,#b8e4d4_66%,#effff9_100%)]" />
              <div aria-hidden="true" className="absolute inset-0 scale-x-150 scale-y-110 bg-[repeating-radial-gradient(ellipse_at_0%_15%,transparent_0_44px,#ffffff07_45px_74px,transparent_75px_111px)]" />
              <span aria-hidden="true" className="fm-hero-wordmark pointer-events-none absolute inset-x-0 top-0 z-1 bg-[linear-gradient(#fff_18%,#f0fff320_94%)] bg-clip-text text-center text-[clamp(94px,15.3vw,211px)] leading-[1.2] font-[750] tracking-[-0.055em] text-transparent max-[800px]:top-3 max-[800px]:text-[14.6vw] max-[580px]:top-3 max-[580px]:text-[14.5vw]">{APP_BRAND.name}</span>
              <motion.img initial={false} animate={{ y: isActive && playing && !reducedMotion ? [0, -6, 0] : 0 }} transition={{ duration: reducedMotion ? 0 : playing ? 7 : 0.35, repeat: isActive && playing && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }} className="fm-hero-person absolute bottom-[-65px] left-1/2 z-2 h-[112%] max-w-[54%] -translate-x-[47%] object-contain object-bottom max-[1100px]:bottom-[-60px] max-[800px]:bottom-[-40px] max-[800px]:max-w-[59%] max-[580px]:bottom-[-30px] max-[580px]:left-[56%] max-[580px]:h-[92%] max-[580px]:w-[85%] max-[580px]:max-w-none max-[580px]:-translate-x-1/2" src="/images/customer-home/farmora-grocer-personal.png" alt="Người cầm túi thực phẩm tươi" fetchPriority="high" />
              <motion.div {...contentMotion} className="absolute bottom-[84px] left-9 z-3 max-[1100px]:left-7 max-[800px]:left-6 max-[580px]:bottom-[78px] max-[580px]:left-4 max-[580px]:w-[60%] max-[580px]:rounded-xl max-[580px]:border max-[580px]:border-white/70 max-[580px]:bg-[#f1fff5ed] max-[580px]:p-4 max-[580px]:backdrop-blur-sm max-[360px]:p-3">
                <span className="flex items-center gap-1.5 text-[8px] font-semibold tracking-[1.5px] text-[#286b5b] max-[580px]:text-[6px] max-[580px]:tracking-[0.7px]"><span className="size-[5px] rounded-full bg-[#088178]" />{WELCOME_BANNER.eyebrow}</span>
                <h2 className="mt-3 mb-3 text-[34px] leading-[1.18] font-[650] tracking-[-1px] text-[#073b30] max-[1100px]:text-[29px] max-[800px]:text-[25px] max-[580px]:text-[23px] max-[360px]:text-xl">{WELCOME_BANNER.headline[0]}<br />{WELCOME_BANNER.headline[1]}</h2>
                <p className="mb-5 text-[11px] leading-[1.8] text-[#47766b] max-[800px]:text-[9px] max-[580px]:mb-3 max-[580px]:text-[8px]">Khám phá cửa hàng và sản phẩm.<br />Chọn nơi mua phù hợp với bạn.</p>
                <BannerButton onClick={onBrowseProducts}>{WELCOME_BANNER.ctaLabel}</BannerButton>
              </motion.div>
              {featuredProduct && <div className="fm-hero-product absolute right-8 bottom-[88px] z-3 w-[155px] -rotate-5 rounded-xl bg-white p-2.5 shadow-[0_14px_35px_#0f554d10] max-[1100px]:right-6 max-[1100px]:w-[132px] max-[800px]:right-4 max-[800px]:w-[110px] max-[580px]:right-4 max-[580px]:bottom-[84px] max-[580px]:w-[95px] max-[580px]:p-1.5">
                <span className="mb-1.5 flex items-center justify-center gap-1 text-[7px] text-[#8a9491] max-[580px]:text-[5px]"><Leaf size={10} />Từ {featuredProduct.storeName}</span>
                <img className="h-[130px] w-full rounded-lg bg-[#f5f5f5] object-contain max-[800px]:h-[95px] max-[580px]:h-[85px]" src={featuredProduct.imageUrl ?? undefined} alt={featuredProduct.name} />
                <div className="pt-2 pr-4"><strong className="block text-[9px] leading-relaxed font-semibold max-[800px]:text-[7px] max-[580px]:text-[6px]">{featuredProduct.name}</strong><span className="mt-0.5 block text-[6px] text-[#929a97] max-[580px]:text-[5px]">{featuredProduct.category?.name ?? featuredProduct.storeName}</span></div>
                <button aria-label={`Xem ${featuredProduct.name}`} onClick={() => onOpenProduct(featuredProduct)} className="absolute right-2 bottom-3 grid size-5 place-items-center rounded-full bg-[#e5f4ed] text-[#088178] max-[580px]:size-4"><ArrowUpRight size={13} /></button>
              </div>}
            </motion.article>
          );
        })}
      </div>

      <div className="absolute inset-x-8 bottom-5 z-20 flex items-center justify-between gap-3 max-[800px]:inset-x-6 max-[580px]:inset-x-4 max-[580px]:bottom-4 max-[580px]:gap-2">
        <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[#315347] shadow-[0_3px_15px_#193e2806] backdrop-blur-md max-[580px]:gap-0 max-[580px]:px-1.5">
          <span className="text-[10px] tabular-nums max-[580px]:hidden">{String(activeIndex + 1).padStart(2, '0')} <span className="text-[#99aba1]">/ {String(slides.length).padStart(2, '0')}</span></span>
          <div className="flex items-center" role="group" aria-label="Choose a banner">{slides.map((slide, i) => <button key={slide.id} aria-label={`Show ${slide.label} banner`} aria-pressed={i === activeIndex} onClick={() => goTo(i)} className="grid h-7 w-8 place-items-center rounded-full max-[580px]:w-6"><span className={`h-[5px] rounded-full transition-[width,background-color] ${i === activeIndex ? 'w-5' : 'w-[5px] bg-[#9eafa5]/60'}`} style={i === activeIndex ? { backgroundColor: accent } : undefined} /></button>)}</div>
        </div>
        <button onClick={onBrowseStores} className="ml-auto flex items-center gap-2 text-[10px] font-medium text-[#315347] max-[800px]:hidden">Xem các cửa hàng<ArrowUpRight size={14} /></button>
        <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/80 p-1 text-[#315347] shadow-[0_3px_15px_#193e2806] backdrop-blur-md">
          <button aria-label="Previous banner" onClick={carousel.previous} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8]"><ChevronLeft size={16} /></button>
          <button aria-label={paused ? 'Play banner rotation' : 'Pause banner rotation'} aria-pressed={paused} disabled={reducedMotion} title={reducedMotion ? 'Automatic rotation is off because reduced motion is enabled' : undefined} onClick={carousel.togglePaused} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8] disabled:cursor-default disabled:opacity-40">{paused || reducedMotion ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}</button>
          <button aria-label="Next banner" onClick={carousel.next} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8]"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20"><motion.div key={`${activeIndex}-${cycle}-${playing}`} initial={{ scaleX: 0 }} animate={{ scaleX: playing ? 1 : 0 }} transition={{ duration: playing ? BANNER_INTERVAL_MS / 1000 : 0, ease: 'linear' }} className="h-full origin-left bg-white/70" /></div>
    </section>
  );
}

function BannerButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-5 rounded-full bg-[#088178] py-1.5 pr-1.5 pl-4 text-[10px] font-medium text-white hover:bg-[#06685f] max-[580px]:gap-3 max-[580px]:py-1 max-[580px]:pl-3 max-[580px]:text-[9px]">{children}<span className="grid size-6 place-items-center rounded-full bg-white text-[#088178]"><ArrowUpRight size={15} /></span></button>;
}
