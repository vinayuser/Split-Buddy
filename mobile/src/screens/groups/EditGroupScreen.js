import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { groupAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EditGroupScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [simplifyDebts, setSimplifyDebts] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const response = await groupAPI.getGroup(groupId);
      if (response.success) {
        setName(response.group.name);
        setDescription(response.group.description || '');
        setSimplifyDebts(response.group.simplifyDebts || false);
        setMembers(response.group.members || []);
      } else {
        Alert.alert('Error', response.message || 'Failed to load group');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load group');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    const member = members.find(m => {
      const mId = m.userId?._id || m.userId;
      return mId?.toString() === memberId?.toString();
    });
    const memberName = member?.userId?.name || 'this member';
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await groupAPI.removeMember(groupId, memberId.toString());
              if (response.success) {
                Alert.alert('Success', 'Member removed successfully', [
                  { text: 'OK', onPress: () => loadGroup() }
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to remove member');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await groupAPI.updateGroup(groupId, {
        name: name.trim(),
        description: description.trim(),
        simplifyDebts
      });
      
      if (response.success) {
        // Navigate back to group detail screen immediately
        // The GroupDetailScreen will automatically refresh via its focus listener
        navigation.navigate('GroupDetail', { groupId });
      } else {
        Alert.alert('Error', response.message || 'Failed to update group');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter group name"
          maxLength={100}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Simplify Debts</Text>
            <Text style={styles.switchDescription}>
              Automatically minimize the number of payments required. This will show you the most efficient way to settle all debts in the group.
            </Text>
          </View>
          <Switch
            value={simplifyDebts}
            onValueChange={setSimplifyDebts}
            trackColor={{ false: '#ccc', true: '#6200ee' }}
            thumbColor={simplifyDebts ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Members ({members.length})</Text>
        <Text style={styles.sectionDescription}>
          Remove members from the group (admins only)
        </Text>
        <FlatList
          data={members}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const memberId = item.userId?._id || item.userId;
            const memberName = item.userId?.name || 'Unknown';
            const isCurrentUser = memberId?.toString() === user._id?.toString();
            const isAdmin = item.role === 'admin';
            const currentUserMember = members.find(m => {
              const mId = m.userId?._id || m.userId;
              return mId?.toString() === user._id?.toString();
            });
            const canRemove = currentUserMember?.role === 'admin' && !isCurrentUser;
            
            return (
              <View style={styles.memberItem}>
                <View style={styles.memberInfo}>
                  <Icon 
                    name={isAdmin ? "account-star" : "account-circle"} 
                    size={24} 
                    color={isAdmin ? "#6200ee" : "#666"} 
                  />
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>
                      {memberName} {isCurrentUser && '(You)'}
                    </Text>
                    {isAdmin && (
                      <Text style={styles.memberRole}>Admin</Text>
                    )}
                  </View>
                </View>
                {canRemove && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(memberId)}
                  >
                    <Icon name="account-minus" size={20} color="#f44336" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          keyExtractor={(item, index) => {
            const memberId = item.userId?._id || item.userId;
            return memberId?.toString() || index.toString();
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No members</Text>
          }
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#6200ee',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});

