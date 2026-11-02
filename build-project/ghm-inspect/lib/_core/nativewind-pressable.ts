// Keep Pressable's NativeWind mapping aligned with the built-in component mappings.
import { Pressable } from "react-native";
import { remapProps } from "nativewind";

remapProps(Pressable, { className: "style" });
