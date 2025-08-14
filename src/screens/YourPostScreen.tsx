/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useContext, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import UserContext from '../context/userContext';

interface Like {
  likeId: string;
  userId: string;
  postId: string;
}

interface Comment {
  commentId: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: string;
}

interface User {
  userId: string;
  username: string;
  email: string;
  userAvatar: string;
  createdAt: string;
  updatedAt: string;
}

interface Post {
  post_id: string;
  content: string;
  mediaUrl: string;
  userId: string;
  user: User;
  likes: Like[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

// Transformed post interface for UI rendering
interface UIPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  caption: string;
  imageUrl: string;
  likes: number;
  comments: UIComment[];
  createdAt: string;
  isLiked: boolean;
}

interface UIComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

function YourPostScreen() {
  const userContext = useContext(UserContext);
  const [posts, setPosts] = useState<UIPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<UIPost | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  // API base URL - replace with your actual API endpoint
  const API_BASE_URL = 'https://astro-api-okfis.ondigitalocean.app/api';

  useEffect(() => {
    fetchUserPosts();
  }, []);

  const transformPosts = (apiPosts: any[]): UIPost[] => {
    return apiPosts.map(post => {
      let imageUrl = post.mediaUrl;
      // If it's a base64 string without the data URI prefix, add it
      if (
        imageUrl &&
        typeof imageUrl === 'string' &&
        (imageUrl.startsWith('iVBOR') || imageUrl.startsWith('/9j/'))
      ) {
        // Determine image type (PNG or JPEG) based on the base64 prefix
        const imageType = imageUrl.startsWith('iVBOR')
          ? 'image/png'
          : 'image/jpeg';
        imageUrl = `data:${imageType};base64,${imageUrl}`;
      }
      return {
        id: post.postId,
        userId: post.userId,
        userName: post.username || '',
        userAvatar: post.userProfilePic || undefined,
        caption: post.content,
        imageUrl: imageUrl,
        likes: post.likes.length,
        comments: post.comments.map(
          (comment: {
            commentId: any;
            userId: any;
            username: any;
            content: any;
            createdAt: any;
          }) => ({
            id: comment.commentId,
            userId: comment.userId,
            userName: comment.username || 'User',
            text: comment.content,
            createdAt: comment.createdAt,
          }),
        ),
        createdAt: post.createdAt,
        isLiked: post.likes.some(
          (like: {userId: string | undefined}) =>
            like.userId === userContext?.userId,
        ),
      };
    });
  };

  const fetchUserPosts = async () => {
    if (!userContext?.userId) {
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/user/post/view?userId=${userContext.userId}`,
        {
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );
      // console.log('received your post', response.data);
      // Check if we got data (status 200) or no content (status 204)
      if (response.status === 204 || !response.data || response.data.error) {
        setPosts([]);
      } else {
        // Transform API response to UI format
        const transformedPosts = transformPosts(response.data);
        setPosts(transformedPosts);
        // console.log('received your posts', transformedPosts);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
      Alert.alert('Error', 'Failed to load your posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserPosts();
  };

  const openOptionsModal = (post: UIPost) => {
    setSelectedPost(post);
    setOptionsModalVisible(true);
  };

  const openEditModal = () => {
    if (selectedPost) {
      setEditedCaption(selectedPost.caption);
      setOptionsModalVisible(false);
      setEditModalVisible(true);
    }
  };

  const openCommentsModal = (post: UIPost) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const updateCaption = async () => {
    if (!selectedPost || !editedCaption.trim()) {
      return;
    }
    try {
      setUpdating(true);
      await axios.put(
        `${API_BASE_URL}/user/post/edit`,
        {
          content: editedCaption.trim(),
          postId: selectedPost.id,
        },
        {
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );
      // Update local state
      const updatedPosts = posts.map(post => {
        if (post.id === selectedPost.id) {
          return {...post, caption: editedCaption.trim()};
        }
        return post;
      });
      setPosts(updatedPosts);
      setEditModalVisible(false);
      setSelectedPost(null);
      Alert.alert('Success', 'Post caption updated successfully');
    } catch (error) {
      console.error('Error updating post caption:', error);
      Alert.alert('Error', 'Failed to update post caption. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const deletePost = async () => {
    if (!selectedPost) {
      return;
    }
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              setOptionsModalVisible(false);
              await axios.delete(
                `${API_BASE_URL}/user/post/delete?postId=${selectedPost.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${userContext?.accessToken}`,
                  },
                },
              );
              // Remove post from local state
              setPosts(posts.filter(post => post.id !== selectedPost.id));
              setSelectedPost(null);
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const deleteComment = async (commentId: string) => {
    if (!selectedPost) {
      return;
    }
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await axios.delete(`${API_BASE_URL}/social/comment`, {
                data: {
                  postId: selectedPost.id,
                  commentId: commentId,
                },
                headers: {
                  Authorization: `Bearer ${userContext?.accessToken}`,
                },
              });
              // Update local state
              const updatedPosts = posts.map(post => {
                if (post.id === selectedPost.id) {
                  return {
                    ...post,
                    comments: post.comments.filter(
                      comment => comment.id !== commentId,
                    ),
                  };
                }
                return post;
              });
              setPosts(updatedPosts);
              // Also update the selected post
              if (selectedPost) {
                setSelectedPost({
                  ...selectedPost,
                  comments: selectedPost.comments.filter(
                    comment => comment.id !== commentId,
                  ),
                });
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert(
                'Error',
                'Failed to delete comment. Please try again.',
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const renderPost = ({item}: {item: UIPost}) => {
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={
                item.userAvatar
                  ? {uri: item.userAvatar}
                  : require('../assets/profile.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.userName}>{item.userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => openOptionsModal(item)}>
            <Image
              source={require('../assets/options.png')}
              style={styles.optionsIcon}
            />
          </TouchableOpacity>
        </View>
        <Image source={{uri: item.imageUrl}} style={styles.postImage} />
        <View style={styles.postContent}>
          <Text style={styles.caption}>{item.caption}</Text>
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Image
                source={require('../assets/heart.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statText}>{item.likes} likes</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openCommentsModal(item)}>
              <Image
                source={require('../assets/comment.png')}
                style={styles.statIcon}
              />
              <Text style={styles.statText}>
                {item.comments.length} comments
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.postDate}>
            Posted on {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001965" />
        <Text style={styles.loadingText}>Loading your posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Posts</Text>
      </View>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.postsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#001965']}
            tintColor="#001965"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/empty-posts.png')}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptyText}>
              You haven't created any posts yet. Your posts will appear here.
            </Text>
          </View>
        }
      />
      {/* Post Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={optionsModalVisible}
        onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.optionsModalContent}>
            <TouchableOpacity style={styles.optionItem} onPress={openEditModal}>
              <Image
                source={require('../assets/pencil.png')}
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>Edit Caption</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionItem, styles.deleteOption]}
              onPress={deletePost}>
              <Image
                source={require('../assets/trash.png')}
                style={[styles.optionIcon, styles.deleteIcon]}
              />
              <Text style={styles.deleteText}>Delete Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Edit Caption Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Caption</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              value={editedCaption}
              onChangeText={setEditedCaption}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.updateButton,
                (!editedCaption.trim() || updating) && styles.disabledButton,
              ]}
              onPress={updateCaption}
              disabled={!editedCaption.trim() || updating}>
              {updating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.updateButtonText}>Update Caption</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Comments Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentsModalVisible}
        onRequestClose={() => setCommentsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.commentsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setCommentsModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedPost && selectedPost.comments.length > 0 ? (
              <FlatList
                data={selectedPost.comments}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.commentsList}
                renderItem={({item}) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUserName}>
                        {item.userName}
                      </Text>
                      <Text style={styles.commentTime}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                    <TouchableOpacity
                      style={styles.deleteCommentButton}
                      onPress={() => deleteComment(item.id)}>
                      <Image
                        source={require('../assets/trash.png')}
                        style={styles.deleteCommentIcon}
                      />
                      <Text style={styles.deleteCommentText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : (
              <View style={styles.noCommentsContainer}>
                <Image
                  source={require('../assets/no-comments.png')}
                  style={styles.noCommentsIcon}
                />
                <Text style={styles.noCommentsText}>No Comments Yet</Text>
                <Text style={styles.noCommentsSubtext}>
                  This post doesn't have any comments yet.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {updating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#001965',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  postsList: {
    padding: 12,
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  optionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsIcon: {
    width: 20,
    height: 20,
    tintColor: '#666666',
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postContent: {
    padding: 12,
  },
  caption: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    marginRight: 4,
    tintColor: '#666666',
  },
  statText: {
    fontSize: 14,
    color: '#666666',
  },
  postDate: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    height: 300,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    tintColor: '#CCCCCC',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  optionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: '#333333',
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  deleteIcon: {
    tintColor: '#E53935',
  },
  deleteText: {
    fontSize: 16,
    color: '#E53935',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  commentsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  captionInput: {
    padding: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: '#001965',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  commentTime: {
    fontSize: 12,
    color: '#888888',
  },
  commentText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  deleteCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  deleteCommentIcon: {
    width: 16,
    height: 16,
    tintColor: '#E53935',
    marginRight: 4,
  },
  deleteCommentText: {
    fontSize: 12,
    color: '#E53935',
  },
  noCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    height: 200,
  },
  noCommentsIcon: {
    width: 60,
    height: 60,
    tintColor: '#CCCCCC',
    marginBottom: 16,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default YourPostScreen;
