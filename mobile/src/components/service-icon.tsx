import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { KIT_LIGHT } from '@/generated/kit-tokens';

// Same ServiceIcon.jsx tile/blob and Lucide glyphs used by the supplied web handoff.
// Lucide glyphs: ISC license, Copyright (c) Lucide Contributors.
// Permission to use, copy, modify, and/or distribute this software for any purpose
// with or without fee is hereby granted, provided that the above copyright notice
// and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS"
// AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING
// ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
// AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR
// ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
// CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
const services = {
  regular: { wash: KIT_LIGHT['blush-wash'], blob: KIT_LIGHT['blush-mid'], paths: ['m16 22-1-4','M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1','M19 14H5l-1.973 6.767A1 1 0 0 0 4 22h16a1 1 0 0 0 .973-1.233z','m8 22 1-4'] },
  airbnb: { wash: KIT_LIGHT['lilac-wash'], blob: KIT_LIGHT['lilac-mid'], paths: ['M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8','M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4','M12 4v6','M2 18h20'] },
  express: { wash: KIT_LIGHT['violet-50'], blob: KIT_LIGHT['violet-200'], paths: ['M13 16a3 3 0 0 1 2.24 5','M18 12h.01','M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3','M20 8.54V4a2 2 0 1 0-4 0v3','M7.612 12.524a3 3 0 1 0-1.6 4.3'] },
  office: { wash: KIT_LIGHT['mist-wash'], blob: KIT_LIGHT['mist-mid'], paths: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z','M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2','M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2','M10 6h4','M10 10h4','M10 14h4','M10 18h4'] },
  moving: { wash: KIT_LIGHT['sage-wash'], blob: KIT_LIGHT['sage-mid'], paths: ['m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4','m21 2-9.6 9.6'] },
  laundry: { wash: KIT_LIGHT['moss-wash'], blob: KIT_LIGHT['moss-mid'], paths: ['M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z'] },
  lux: { wash: KIT_LIGHT['honey-wash'], blob: KIT_LIGHT['honey-mid'], paths: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z','M20 3v4','M22 5h-4','M4 17v2','M5 18H3'] },
};
export type ServiceIconName = keyof typeof services;

export function ServiceIcon({ service, size = 46 }: { service: ServiceIconName; size?: number }) {
  const { wash, blob, paths } = services[service];
  const glyphSize = Math.round(size * .52);
  const ink = { fill: 'none', stroke: KIT_LIGHT['neutral-0'], strokeWidth: 2.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: 16, backgroundColor: wash, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: Math.round(size * .44), height: Math.round(size * .44), right: Math.round(size * .12), bottom: Math.round(size * .13), backgroundColor: blob, opacity: .92,
      borderTopLeftRadius: Math.round(size * .18), borderTopRightRadius: Math.round(size * .22), borderBottomRightRadius: Math.round(size * .15), borderBottomLeftRadius: Math.round(size * .24) }} />
    <Svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24">{paths.map(d => <Path key={d} d={d} {...ink} />)}{service === 'moving' && <Circle cx="7.5" cy="15.5" r="5.5" {...ink} />}</Svg>
  </View>;
}
