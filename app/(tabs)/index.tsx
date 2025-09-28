import {
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { Linking } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  qualityScore: number;
  adTrackerScore: number;
  biasScore: number;
}

interface SearchSummary {
  totalResults: number;
  avgQuality: number;
  avgAdTracker: number;
  avgBias: number;
  biasVariables: string[];
}

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    // Mock API call with simulated delay
    setTimeout(() => {
      const mockWebResults = [
        {
          id: "1",
          title: "Mock Result 1: " + query,
          url: "https://example.com/1",
          description: "A high-quality result for " + query,
        },
        {
          id: "2",
          title: "Mock Result 2: " + query,
          url: "https://example.com/2",
          description: "Another result with low ads for " + query,
        },
        {
          id: "3",
          title: "Mock Result 3: " + query,
          url: "https://example.com/3",
          description: "Balanced bias result for " + query,
        },
      ];

      // Transform results and add mock scores
      const transformedResults: SearchResult[] = mockWebResults.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        description: item.description,
        qualityScore: Math.floor(Math.random() * 100) + 1, // Mock: 1-100
        adTrackerScore: Math.floor(Math.random() * 100) + 1, // Mock: Lower is better (fewer ads/trackers)
        biasScore: Math.floor(Math.random() * 100) + 1, // Mock: 1-100 (lower bias better?)
      }));

      setResults(transformedResults);

      // Generate mock summary
      const total = transformedResults.length;
      const avgQuality =
        total > 0
          ? transformedResults.reduce((sum, r) => sum + r.qualityScore, 0) /
            total
          : 0;
      const avgAdTracker =
        total > 0
          ? transformedResults.reduce((sum, r) => sum + r.adTrackerScore, 0) /
            total
          : 0;
      const avgBias =
        total > 0
          ? transformedResults.reduce((sum, r) => sum + r.biasScore, 0) / total
          : 0;
      const biasVariables = [
        "Political slant",
        "Commercial bias",
        "Source credibility",
      ]; // Mock

      setSummary({
        totalResults: total,
        avgQuality: Math.round(avgQuality),
        avgAdTracker: Math.round(avgAdTracker),
        avgBias: Math.round(avgBias),
        biasVariables,
      });
      setLoading(false);
    }, 1000); // Simulate 1 second delay
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => Linking.openURL(item.url)}
    >
      <ThemedText type="subtitle">{item.title}</ThemedText>
      <ThemedText>{item.description}</ThemedText>
      <ThemedText>
        Quality: {item.qualityScore}/100 | Ads/Trackers: {item.adTrackerScore}
        /100 | Bias: {item.biasScore}/100
      </ThemedText>
      <ThemedText style={styles.url}>{item.url}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search the web..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />
      {loading && <ActivityIndicator size="large" />}
      {summary && (
        <ThemedView style={styles.summary}>
          <ThemedText type="title">Search Summary</ThemedText>
          <ThemedText>Total Results: {summary.totalResults}</ThemedText>
          <ThemedText>Avg Quality: {summary.avgQuality}/100</ThemedText>
          <ThemedText>Avg Ads/Trackers: {summary.avgAdTracker}/100</ThemedText>
          <ThemedText>Avg Bias: {summary.avgBias}/100</ThemedText>
          <ThemedText>
            Bias Variables: {summary.biasVariables.join(", ")}
          </ThemedText>
        </ThemedView>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        ListEmptyComponent={
          loading ? null : (
            <ThemedText>No results yet. Enter a query and search.</ThemedText>
          )
        }
      />
      <Link href="/modal" style={styles.link}>
        <ThemedText type="link">About This App</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchBar: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  summary: { marginBottom: 16, padding: 8, backgroundColor: "#f0f0f0" },
  resultItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  url: { fontSize: 12, color: "blue" },
  link: { marginTop: 16, alignSelf: "center" },
});
