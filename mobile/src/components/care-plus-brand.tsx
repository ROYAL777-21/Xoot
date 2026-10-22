import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { nativeFonts, nativePalette } from './native-core';

/** The supplied handoff's heart-plus membership mark, for native surfaces. */
export function CarePlusBrand({ size = 28 }: { size?: number }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.25 }} accessible accessibilityLabel="Care+">
    <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
      <G fill="none" stroke={nativePalette.careInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <G transform="translate(-1 7) scale(0.7) rotate(-6 13.6 17)"><Path d="M13.6,27.2 C8.4,23 3,18.6 3,13.4 C3,9.6 5.8,7 9.2,7 C11.4,7 13,8.4 13.8,10.4 C14.6,8.5 16.3,7.2 18.5,7.2 C21.8,7.2 24.3,9.8 24.2,13.4 C24.1,18.4 19,22.9 13.6,27.2 Z" /></G>
        <Path d="M24.25,1.5 V14" /><Path d="M18,7.75 H30.5" />
      </G>
    </Svg>
    <Text style={{ fontFamily: nativeFonts.bodyBold, fontSize: size, color: nativePalette.careInk }}>Care+</Text>
  </View>;
}
