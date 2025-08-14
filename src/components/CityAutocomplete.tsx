import React, {useState} from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import {mapCityName, getCityDisplayName, getCityServerValue, getCustomCitySuggestions} from '../utils/cityMapping';

interface City {
  name: string;
  country: string;
}
interface CityAutocompleteProps {
  onSelectCity: (city: string) => void;
  initialCity?: string; // Add this prop
}
const CityAutocomplete = ({
  onSelectCity,
  initialCity = '', // Add default value
}: CityAutocompleteProps) => {
  const [query, setQuery] = useState(initialCity || '');
  const [cities, setCities] = useState<City[]>([]);

  const searchCities = async (text: string) => {
    if (text.length < 2) {
      setCities([]);
      return;
    }

    try {
      // Get custom city suggestions first
      const customSuggestions = getCustomCitySuggestions(text);
      
      // Get API suggestions
      const response = await fetch(
        `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${text}&limit=10`,
        {
          headers: {
            'X-RapidAPI-Key':
              '9d00048e9fmsh7b74c443f9271a7p1f0806jsn2370c0c3634f', // Get free key from RapidAPI
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
          },
        },
      );
      const data = await response.json();
      const apiCities = data.data?.map((city: any) => ({
        name: city.name,
        country: city.country,
      })) || [];

      // Combine custom suggestions with API results
      // Remove duplicates by filtering API results that match custom suggestions
      const filteredApiCities = apiCities.filter((apiCity: City) => 
        !customSuggestions.some(customCity => 
          customCity.name.toLowerCase() === apiCity.name.toLowerCase()
        )
      );

      const allCities = [...customSuggestions, ...filteredApiCities];
      setCities(allCities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      // If API fails, still show custom suggestions
      const customSuggestions = getCustomCitySuggestions(text);
      setCities(customSuggestions);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={text => {
          setQuery(text);
          searchCities(text);
        }}
        placeholder="Enter city name"
        placeholderTextColor="grey"
      />
      <FlatList
        data={cities}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              // Use the city name as displayed, but send mapped value to server
              setQuery(item.name); // Display selected city name in UI
              onSelectCity(getCityServerValue(item.name)); // Send mapped name to parent/server
              setCities([]);
            }}>
            <Text style={styles.itemText}>
              {item.name}, {item.country}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 5,
    paddingLeft: 10,
    color: 'black',
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: 'white',
  },
  itemText: {
    color: 'black',
  },
});

export default CityAutocomplete;
