import { motion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Leaf, Pause, Play } from 'lucide-react';
import { APP_BRAND } from '../../../app/branding';
import { CUSTOMER_BANNERS } from '../data/customerBanners';
import { CUSTOMER_STORES, type CustomerStore } from '../data/customerStores';
import type { CustomerDisplayProduct } from '../customer.types';
import { useBannerCarousel, BANNER_INTERVAL_MS } from '../hooks/useBannerCarousel';
import { CustomerStoreLogo } from './CustomerStoreLogo';
import { containerClass } from './CustomerCommerce';

interface CustomerBannerCarouselProps {
  variant?: 'home' | 'shop';
  selectedStore: CustomerStore;
  featuredProduct?: CustomerDisplayProduct;
  onBrowseProducts: () => void;
  onBrowseStores: () => void;
  onShopStore: (storeId: string) => void;
  onBannerStoreChange: (storeId: string) => void;
}

export function CustomerBannerCarousel({ variant = 'home', selectedStore, featuredProduct, onBrowseProducts, onBrowseStores, onShopStore, onBannerStoreChange }: CustomerBannerCarouselProps) {
  const expectedStore = useRef(selectedStore.id);
  const carousel = useBannerCarousel(CUSTOMER_BANNERS.length, nextIndex => {
    const storeId = CUSTOMER_BANNERS[nextIndex].storeId;
    if (!storeId) return;
    expectedStore.current = storeId;
    if (storeId !== selectedStore.id) onBannerStoreChange(storeId);
  });
  const { index, playing, paused, reducedMotion, rootRef, cycle, goTo } = carousel;
  const activeBanner = CUSTOMER_BANNERS[index];
  const home = variant === 'home';
  const duration = reducedMotion ? 0 : 0.65;

  useEffect(() => {
    if (expectedStore.current === selectedStore.id) return;
    expectedStore.current = selectedStore.id;
    const matchingIndex = CUSTOMER_BANNERS.findIndex(banner => banner.storeId === selectedStore.id);
    if (matchingIndex >= 0) goTo(matchingIndex, false);
  }, [selectedStore.id, goTo]);

  return (
    <section
      ref={rootRef}
      id={`customer-banner-${variant}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      tabIndex={0}
      className={`${home ? 'fm-hero h-[clamp(420px,40vw,520px)] max-[800px]:h-[420px]' : 'storefront-hero h-[360px] max-[800px]:h-[340px]'} ${containerClass} relative isolate touch-pan-y overflow-hidden rounded-[18px] max-[580px]:h-[500px] max-[580px]:rounded-[13px] max-[360px]:h-[480px]`}
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
          goTo(index + (event.key === 'ArrowRight' ? 1 : -1));
        }
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          goTo(event.key === 'Home' ? 0 : CUSTOMER_BANNERS.length - 1);
        }
      }}
    >
      <h1 id={home ? 'fm-hero-title' : 'shop-title'} className="sr-only">{APP_BRAND.name} — {home ? 'Your neighborhood stores and everyday favorites' : `Shop at ${selectedStore.englishName}`}</h1>
      <div aria-live={playing ? 'off' : 'polite'} aria-atomic="false" className="absolute inset-0">
        {CUSTOMER_BANNERS.map((banner, slideIndex) => {
          const active = slideIndex === index;
          const store = CUSTOMER_STORES.find(item => item.id === banner.storeId);
          const cta = banner.storeId ? () => onShopStore(banner.storeId!) : onBrowseProducts;
          const contentMotion = {
            animate: { opacity: active ? 1 : 0, y: active ? 0 : 16 },
            transition: { duration, delay: active && !reducedMotion ? 0.13 : 0, ease: 'easeOut' as const },
          };
          return (
            <motion.article
              key={banner.id}
              data-banner-id={banner.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${CUSTOMER_BANNERS.length}: ${banner.label}`}
              aria-hidden={!active}
              inert={!active}
              initial={false}
              animate={{ opacity: active ? 1 : 0, x: active || reducedMotion ? 0 : 24 }}
              transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 overflow-hidden"
              style={{ backgroundColor: banner.background, color: banner.ink, zIndex: active ? 2 : 1, pointerEvents: active ? 'auto' : 'none' }}
            >
              {banner.image ? <>
                <div className="absolute inset-0 max-[580px]:top-[52%]">
                  <motion.img
                    src={banner.image}
                    alt={banner.imageAlt}
                    initial={false}
                    animate={{ scale: active && playing && !reducedMotion ? 1.035 : 1 }}
                    transition={{ duration: active && playing && !reducedMotion ? BANNER_INTERVAL_MS / 1000 : reducedMotion ? 0 : 0.35, ease: 'linear' }}
                    className="size-full object-cover object-right"
                    loading={slideIndex <= 1 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff20,transparent_55%)] max-[580px]:hidden" />
                  <div className="absolute inset-x-0 top-0 hidden h-12 max-[580px]:block" style={{ background: `linear-gradient(${banner.background}, transparent)` }} />
                </div>
                <motion.div {...contentMotion} className="absolute top-1/2 left-12 z-1 w-[46%] -translate-y-[58%] max-[1100px]:left-8 max-[800px]:left-7 max-[800px]:w-[49%] max-[580px]:inset-x-6 max-[580px]:top-6 max-[580px]:w-auto max-[580px]:translate-y-0 max-[360px]:inset-x-5 max-[360px]:top-5">
                  {store && <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/65 py-1 pr-3 pl-1 shadow-[0_3px_15px_#172c1805] backdrop-blur-sm max-[800px]:mb-3 max-[580px]:mb-3">
                    <CustomerStoreLogo store={store} className="size-6 rounded-full" /><span className="text-[10px] font-medium max-[580px]:text-[9px]">{store.englishName}</span>
                  </div>}
                  <p className="text-[9px] font-semibold tracking-[1.7px] opacity-65 max-[800px]:text-[7px] max-[580px]:text-[7px] max-[580px]:tracking-[1.3px]">{banner.eyebrow}</p>
                  <h2 className={`${home ? 'text-[49px] max-[1100px]:text-[42px]' : 'text-[41px] max-[1100px]:text-[36px]'} mt-3 leading-[1.08] font-[650] tracking-[-1.8px] max-[800px]:text-[33px] max-[580px]:mt-3 max-[580px]:text-[34px] max-[580px]:tracking-[-1.3px] max-[360px]:text-[29px]`}>
                    {banner.headline[0]}<br />{banner.headline[1]}
                  </h2>
                  <p className="mt-4 max-w-[310px] text-xs leading-[1.8] opacity-75 max-[800px]:mt-3 max-[800px]:text-[10px] max-[580px]:mt-3 max-[580px]:max-w-[290px] max-[580px]:text-[11px] max-[360px]:text-[10px]">{banner.description}</p>
                  <button onClick={cta} className="mt-5 inline-flex items-center gap-5 rounded-full py-1.5 pr-1.5 pl-4 text-[11px] font-medium text-white hover:brightness-110 max-[580px]:mt-4 max-[580px]:text-[10px]" style={{ backgroundColor: banner.accent }}>{banner.ctaLabel}<span className="grid size-7 place-items-center rounded-full bg-white/95 max-[580px]:size-6" style={{ color: banner.accent }}><ArrowUpRight size={16} /></span></button>
                </motion.div>
              </> : home ? <>
                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(172deg,#11745e_0%,#28967b_22%,#b8e4d4_66%,#effff9_100%)]" />
                <div aria-hidden="true" className="absolute inset-0 scale-x-150 scale-y-110 bg-[repeating-radial-gradient(ellipse_at_0%_15%,transparent_0_44px,#ffffff07_45px_74px,transparent_75px_111px)]" />
                <span aria-hidden="true" className="fm-hero-wordmark pointer-events-none absolute inset-x-0 top-0 z-1 bg-[linear-gradient(#fff_18%,#f0fff320_94%)] bg-clip-text text-center text-[clamp(94px,15.3vw,211px)] leading-[1.2] font-[750] tracking-[-0.055em] text-transparent max-[800px]:top-3 max-[800px]:text-[14.6vw] max-[580px]:top-3 max-[580px]:text-[14.5vw]">{APP_BRAND.name}</span>
                <motion.img initial={false} animate={{ y: active && playing && !reducedMotion ? [0, -6, 0] : 0 }} transition={{ duration: reducedMotion ? 0 : playing ? 7 : 0.35, repeat: active && playing && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }} className="fm-hero-person absolute bottom-[-65px] left-1/2 z-2 h-[112%] max-w-[54%] -translate-x-[47%] object-contain object-bottom max-[1100px]:bottom-[-60px] max-[800px]:bottom-[-40px] max-[800px]:max-w-[59%] max-[580px]:bottom-[-30px] max-[580px]:left-[56%] max-[580px]:h-[92%] max-[580px]:w-[85%] max-[580px]:max-w-none max-[580px]:-translate-x-1/2" src="/images/customer-home/farmora-grocer-personal.png" alt="RetailSpace grocery assistant holding a bag of fresh groceries" fetchPriority="high" />
                <motion.div {...contentMotion} className="absolute bottom-[84px] left-9 z-3 max-[1100px]:left-7 max-[800px]:left-6 max-[580px]:bottom-[78px] max-[580px]:left-4 max-[580px]:w-[60%] max-[580px]:rounded-xl max-[580px]:border max-[580px]:border-white/70 max-[580px]:bg-[#f1fff5ed] max-[580px]:p-4 max-[580px]:backdrop-blur-sm max-[360px]:p-3">
                  <span className="flex items-center gap-1.5 text-[8px] font-semibold tracking-[1.5px] text-[#286b5b] max-[580px]:text-[6px] max-[580px]:tracking-[0.7px]"><span className="size-[5px] rounded-full bg-[#088178]" />{banner.eyebrow}</span>
                  <h2 className="mt-3 mb-3 text-[34px] leading-[1.18] font-[650] tracking-[-1px] text-[#073b30] max-[1100px]:text-[29px] max-[800px]:text-[25px] max-[580px]:text-[23px] max-[360px]:text-xl">{banner.headline[0]}<br />{banner.headline[1]}</h2>
                  <p className="mb-5 text-[11px] leading-[1.8] text-[#47766b] max-[800px]:text-[9px] max-[580px]:mb-3 max-[580px]:text-[8px]">Discover stores and favorite brands.<br />Choose a store, then fill your basket.</p>
                  <BannerButton onClick={onBrowseProducts}>Shop now</BannerButton>
                </motion.div>
                {featuredProduct && <div className="fm-hero-product absolute right-8 bottom-[88px] z-3 w-[155px] -rotate-5 rounded-xl bg-white p-2.5 shadow-[0_14px_35px_#0f554d10] max-[1100px]:right-6 max-[1100px]:w-[132px] max-[800px]:right-4 max-[800px]:w-[110px] max-[580px]:right-4 max-[580px]:bottom-[84px] max-[580px]:w-[95px] max-[580px]:p-1.5">
                  <span className="mb-1.5 flex items-center justify-center gap-1 text-[7px] text-[#8a9491] max-[580px]:text-[5px]"><Leaf size={10} />Picked from your store</span>
                  <img className="h-[130px] w-full rounded-lg bg-[#f5f5f5] object-contain max-[800px]:h-[95px] max-[580px]:h-[85px]" src={featuredProduct.image} alt={featuredProduct.name} />
                  <div className="pt-2 pr-4"><strong className="block text-[9px] leading-relaxed font-semibold max-[800px]:text-[7px] max-[580px]:text-[6px]">{featuredProduct.name}</strong><span className="mt-0.5 block text-[6px] text-[#929a97] max-[580px]:text-[5px]">{featuredProduct.brand || featuredProduct.category}</span></div>
                  <button aria-label={`Explore products at ${selectedStore.englishName}`} onClick={onBrowseProducts} className="absolute right-2 bottom-3 grid size-5 place-items-center rounded-full bg-[#e5f4ed] text-[#088178] max-[580px]:size-4"><ArrowUpRight size={13} /></button>
                </div>}
              </> : <>
                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,#087568_0%,#45a38c_52%,#d2efdf_100%)]" />
                <div aria-hidden="true" className="absolute inset-0 bg-[repeating-radial-gradient(ellipse_at_85%_40%,transparent_0_50px,#ffffff09_51px_83px,transparent_84px_140px)]" />
                <motion.div {...contentMotion} className="absolute top-[42%] left-10 z-1 w-[60%] -translate-y-1/2 text-white max-[800px]:left-7 max-[580px]:inset-x-6 max-[580px]:top-7 max-[580px]:w-auto max-[580px]:translate-y-0">
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[8px] tracking-[1px] text-[#defff1]"><Leaf size={11} />YOUR NEIGHBORHOOD, IN ONE PLACE</span>
                  <h2 className="text-[42px] leading-[1.12] font-[650] tracking-[-1.8px] max-[800px]:text-[34px] max-[580px]:text-[33px] max-[360px]:text-[29px]">Everyday favorites.<br />A little closer to home.</h2>
                  <p className="mt-4 max-w-[310px] text-[11px] leading-[1.8] text-[#e4f8ee] max-[580px]:max-w-[240px] max-[580px]:text-[10px]">Fresh finds, familiar brands, and the things you love.<br />Handpicked at {selectedStore.englishName}.</p>
                  <button onClick={onBrowseProducts} className="mt-5 inline-flex items-center gap-4 rounded-full bg-white py-1.5 pr-1.5 pl-4 text-[10px] font-semibold text-[#088178] hover:bg-[#e4f8ee]">Explore the store<span className="grid size-6 place-items-center rounded-full bg-[#088178] text-white"><ArrowUpRight size={15} /></span></button>
                </motion.div>
                <motion.img initial={false} animate={{ y: active && playing && !reducedMotion ? [0, -5, 0] : 0 }} transition={{ duration: reducedMotion ? 0 : playing ? 7 : 0.35, repeat: active && playing && !reducedMotion ? Infinity : 0, ease: 'easeInOut' }} className="absolute right-3 bottom-[26px] h-[340px] w-[44%] object-contain max-[800px]:right-0 max-[800px]:h-[280px] max-[580px]:right-[-22px] max-[580px]:bottom-14 max-[580px]:h-[210px] max-[580px]:w-[65%] max-[360px]:h-[180px]" src="/images/customer-home/fresh/grocery-basket.png" alt="A carefully arranged basket of fresh groceries" fetchPriority="high" />
              </>}
            </motion.article>
          );
        })}
      </div>

      <div className="absolute inset-x-8 bottom-5 z-20 flex items-center justify-between gap-3 max-[800px]:inset-x-6 max-[580px]:inset-x-4 max-[580px]:bottom-4 max-[580px]:gap-2">
        <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[#315347] shadow-[0_3px_15px_#193e2806] backdrop-blur-md max-[580px]:gap-0 max-[580px]:px-1.5">
          <span className="text-[10px] tabular-nums max-[580px]:hidden">{String(index + 1).padStart(2, '0')} <span className="text-[#99aba1]">/ {String(CUSTOMER_BANNERS.length).padStart(2, '0')}</span></span>
          <div className="flex items-center" role="group" aria-label="Choose a banner">{CUSTOMER_BANNERS.map((banner, i) => <button key={banner.id} aria-label={`Show ${banner.label} banner`} aria-pressed={i === index} onClick={() => goTo(i)} className="grid h-7 w-8 place-items-center rounded-full max-[580px]:w-6"><span className={`h-[5px] rounded-full transition-[width,background-color] ${i === index ? 'w-5' : 'w-[5px] bg-[#9eafa5]/60'}`} style={i === index ? { backgroundColor: activeBanner.accent } : undefined} /></button>)}</div>
        </div>
        <button onClick={onBrowseStores} className="ml-auto flex items-center gap-2 text-[10px] font-medium text-[#315347] max-[800px]:hidden">Explore all stores<ArrowUpRight size={14} /></button>
        <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/80 p-1 text-[#315347] shadow-[0_3px_15px_#193e2806] backdrop-blur-md">
          <button aria-label="Previous banner" onClick={carousel.previous} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8]"><ChevronLeft size={16} /></button>
          <button aria-label={paused ? 'Play banner rotation' : 'Pause banner rotation'} aria-pressed={paused} disabled={reducedMotion} title={reducedMotion ? 'Automatic rotation is off because reduced motion is enabled' : undefined} onClick={carousel.togglePaused} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8] disabled:cursor-default disabled:opacity-40">{paused || reducedMotion ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}</button>
          <button aria-label="Next banner" onClick={carousel.next} className="grid size-7 place-items-center rounded-full hover:bg-[#e6efe8]"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20"><motion.div key={`${index}-${cycle}-${playing}`} initial={{ scaleX: 0 }} animate={{ scaleX: playing ? 1 : 0 }} transition={{ duration: playing ? BANNER_INTERVAL_MS / 1000 : 0, ease: 'linear' }} className="h-full origin-left bg-white/70" /></div>
    </section>
  );
}

function BannerButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-5 rounded-full bg-[#088178] py-1.5 pr-1.5 pl-4 text-[10px] font-medium text-white hover:bg-[#06685f] max-[580px]:gap-3 max-[580px]:py-1 max-[580px]:pl-3 max-[580px]:text-[9px]">{children}<span className="grid size-6 place-items-center rounded-full bg-white text-[#088178]"><ArrowUpRight size={15} /></span></button>;
}
