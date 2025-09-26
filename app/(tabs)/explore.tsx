import { Image } from "expo-image";
import { Platform, StyleSheet, FlatList } from "react-native";
import { useState } from "react";

import { Collapsible } from "@/components/ui/collapsible";
import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

interface HistoryItem {
  id: string;
  query: string;
  timestamp: string;
}

export default function ExploreScreen() {
  const [history] = useState<HistoryItem[]>([
    { id: "1", query: "privacy focused search", timestamp: "2023-10-01" },
    { id: "2", query: "best unbiased news", timestamp: "2023-10-02" },
  ]); // Mock history

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <ThemedView style={styles.historyItem}>
      <ThemedText>{item.query}</ThemedText>
      <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
    </ThemedView>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="magnifyingglass"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Explore Search
        </ThemedText>
      </ThemedView>
      <Collapsible title="App Philosophy">
        <ThemedText>
          This app is the opposite of bloated search engines. No ads, no
          sponsored results, no review boosting. We prioritize quality, privacy,
          and getting you out fast with trustworthy info.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Search Tips">
        <ThemedText>
          - Use specific keywords for better results. - Check scores: Higher
          quality, lower ads/trackers, balanced bias. - Review the summary to
          understand result biases. - Links open in your browser for quick exit.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Recent Searches">
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          ListEmptyComponent={<ThemedText>No recent searches</ThemedText>}
        />
      </Collapsible>
      <Collapsible title="How Scores Work">
        <ThemedText>
          - Content Quality: Based on depth, accuracy, and relevance (1-100). -
          Ads/Trackers: Estimated ad and tracker load (lower is better). - Bias:
          Analysis of potential biases like political or commercial slant.
        </ThemedText>
        <ExternalLink href="https://brave.com/search/">
          <ThemedText type="link">Powered by Brave Search</ThemedText>
        </ExternalLink>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  historyItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  timestamp: {
    fontSize: 12,
    color: "gray",
  },
});
