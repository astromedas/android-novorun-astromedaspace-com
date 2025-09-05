/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useContext, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import UserContext from '../context/userContext';
import axios from 'axios';

// Define types for our data
interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  caption: string;
  imageUrl: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
  isLiked: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// Debounce hook to prevent rapid consecutive calls
const useDebounce = (func: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  return (...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const CommunityScreen: React.FC = () => {
  const userContext = useContext(UserContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const requestInProgressRef = useRef(false);
  const [receivedPostIds, setReceivedPostIds] = useState<string[]>([]);
  const API_BASE_URL = 'https://ecf63b299473.ngrok-free.app/api';

  const mapApiPostToComponentPost = (apiPost: any): Post => {
    let imageUrl = apiPost.mediaUrl;
    if (
      imageUrl &&
      typeof imageUrl === 'string' &&
      (imageUrl.startsWith('iVBOR') || imageUrl.startsWith('/9j/'))
    ) {
      const imageType = imageUrl.startsWith('iVBOR')
        ? 'image/png'
        : 'image/jpeg';
      imageUrl = `data:${imageType};base64,${imageUrl}`;
    }

    const comments = Array.isArray(apiPost.comments) ? apiPost.comments : [];

    return {
      id: apiPost.post_id || apiPost.id || '',
      userId: apiPost.postedBy?.userId || apiPost.userId || '',
      userName: apiPost.postedBy?.fullName || apiPost.userName || '',
      userAvatar: apiPost.postedBy?.profilePic || apiPost.userAvatar,
      caption: apiPost.content || apiPost.caption || '',
      imageUrl: imageUrl || '',
      likes: apiPost.likeCount || apiPost.likes || 0,
      comments: comments.map((comment: any) => ({
        id: comment.comment_id || comment.id || '',
        userId: comment.user?.userId || comment.userId || '',
        userName: comment.user?.fullName || comment.userName || '',
        text: comment.content || comment.text || '',
        createdAt: comment.createdAt || new Date().toISOString(),
      })),
      createdAt: apiPost.createdAt || new Date().toISOString(),
      isLiked: apiPost.isLiked || false,
    };
  };

  const debouncedFetchPosts = useDebounce((refresh = false) => {
    fetchPosts(refresh);
  }, 300);

  useEffect(() => {
    debouncedFetchPosts(true);
  }, []);

  const fetchPosts = async (refresh = false) => {
    if (
      requestInProgressRef.current ||
      (loading && !refresh) ||
      (isLoadingMore && !refresh) ||
      (!hasMorePosts && !refresh)
    ) {
      return;
    }

    requestInProgressRef.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      if (refresh) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const postIdsToExclude = refresh ? [] : receivedPostIds;
      const lastPostId =
        posts.length > 0 && !refresh ? posts[posts.length - 1].id : '';

      const response = await axios.post(
        `${API_BASE_URL}/public/post/all`,
        {
          excludePostIds: postIdsToExclude.join(','),
          lastPostId: lastPostId,
          userId: userContext?.userId,
        },
        {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );

      if (response.data) {
        const postsData = Array.isArray(response.data)
          ? response.data
          : response.data.posts || [];

        if (Array.isArray(postsData)) {
          const newPosts = postsData.map(mapApiPostToComponentPost);
          const newPostIds = newPosts.map(post => post.id);

          if (refresh) {
            setPosts(newPosts);
            setReceivedPostIds(newPostIds);
          } else {
            setPosts([...posts, ...newPosts]);
            setReceivedPostIds([...receivedPostIds, ...newPostIds]);
          }

          setHasMorePosts(newPosts.length > 0);
        } else {
          console.error('Invalid response format:', response.data);
          Alert.alert('Error', 'Received invalid data format from server');
        }
      } else {
        console.error('Empty response data');
        Alert.alert('Error', 'No data received from server');
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request was cancelled (timeout)');
        Alert.alert('Error', 'Request timed out. Please try again.');
      } else {
        console.error('Error fetching posts:', error);
        Alert.alert('Error', 'Failed to load posts. Please try again later.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
      requestInProgressRef.current = false;
    }
  };

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    debouncedFetchPosts(true);
  };

  const handleEndReached = () => {
    if (
      !loading &&
      !isLoadingMore &&
      hasMorePosts &&
      !requestInProgressRef.current
    ) {
      debouncedFetchPosts(false);
    }
  };

  const openImagePicker = () => {
    setImagePickerModalVisible(true);
  };

  const pickImageFromGallery = async () => {
    setImagePickerModalVisible(false);

    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (result.assets && result.assets.length > 0) {
      if (result.assets[0].base64) {
        setSelectedImage(
          `data:image/${
            result.assets[0].type?.split('/')[1] || 'jpeg'
          };base64,${result.assets[0].base64}`,
        );
      } else if (result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
        console.log('Warning: Base64 data not available, using URI instead');
      }
    }
  };

  const takePhoto = async () => {
    setImagePickerModalVisible(false);

    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (result.assets && result.assets.length > 0) {
      if (result.assets[0].base64) {
        setSelectedImage(
          `data:image/${
            result.assets[0].type?.split('/')[1] || 'jpeg'
          };base64,${result.assets[0].base64}`,
        );
      } else if (result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
        console.log('Warning: Base64 data not available, using URI instead');
      }
    }
  };

  const createPost = async () => {
    if (!caption.trim() || !selectedImage) {
      Alert.alert('Error', 'Please add both caption and image');
      return;
    }

    if (postSubmitting) {
      return;
    }

    try {
      setPostSubmitting(true);
      let mediaData = selectedImage;
      if (selectedImage?.startsWith('data:image')) {
        mediaData = selectedImage.split(',')[1];
      }

      const response = await axios.post(
        `${API_BASE_URL}/public/post/create`,
        {
          userId: userContext?.userId,
          content: caption.trim(),
          mediaUrl: mediaData,
        },
        {
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );

      if (response.status === 201) {
        const newPost = mapApiPostToComponentPost(response.data.post);
        setPosts([newPost, ...posts]);
        setReceivedPostIds([newPost.id, ...receivedPostIds]);
        setCaption('');
        setSelectedImage(null);
        setModalVisible(false);
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({offset: 0, animated: true});
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      const postIndex = posts.findIndex(post => post.id === postId);
      if (postIndex === -1) {
        return;
      }

      const post = posts[postIndex];
      const isCurrentlyLiked = post.isLiked;

      const updatedPosts = [...posts];
      updatedPosts[postIndex] = {
        ...post,
        isLiked: !isCurrentlyLiked,
        likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
      };
      setPosts(updatedPosts);

      await axios.post(
        `${API_BASE_URL}/social/like`,
        {
          userId: userContext?.userId,
          postId: postId,
          action: isCurrentlyLiked ? 'unlike' : 'like',
        },
        {
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      debouncedFetchPosts(true);
    }
  };

  const openCommentModal = (postId: string) => {
    setCurrentPostId(postId);
    setCommentModalVisible(true);
  };

  const addComment = async () => {
    if (!commentText.trim() || !currentPostId || commenting) {
      return;
    }

    try {
      setCommenting(true);
      const response = await axios.post(
        `${API_BASE_URL}/social/comment`,
        {
          userId: userContext?.userId,
          postId: currentPostId,
          content: commentText.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${userContext?.accessToken}`,
          },
        },
      );

      if (response.status === 201) {
        const apiComment = response.data.comment;
        const newComment: Comment = {
          id: apiComment.comment_id || '',
          userId: apiComment.userId || '',
          userName: userContext?.name || 'User',
          text: commentText.trim(),
          createdAt: new Date().toISOString(),
        };

        const updatedPosts = posts.map(post => {
          if (post.id === currentPostId) {
            return {
              ...post,
              comments: [...post.comments, newComment],
            };
          }
          return post;
        });

        setPosts(updatedPosts);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setCommenting(false);
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    try {
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(comment => comment.id !== commentId),
          };
        }
        return post;
      });

      setPosts(updatedPosts);

      await axios.delete(`${API_BASE_URL}/social/comment`, {
        headers: {
          Authorization: `Bearer ${userContext?.accessToken}`,
        },
        data: {
          userId: userContext?.userId,
          postId: postId,
          commentId: commentId,
        },
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      debouncedFetchPosts(true);
    }
  };

  const renderPost = ({item}: {item: Post}) => {
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={
                item.userName === 'Admin'
                  ? require('../assets/novoRUN_circular.png')
                  : item.userAvatar
                  ? {uri: item.userAvatar}
                  : require('../assets/profile.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.userName}>
              {item.userName === 'Admin' ? 'novorun' : item.userName}
            </Text>
          </View>
          <Text style={styles.postDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Image source={{uri: item.imageUrl}} style={styles.postImage} />
        <View style={styles.postContent}>
          <Text style={styles.caption}>{item.caption}</Text>
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleLike(item.id)}>
              <Image
                source={
                  item.isLiked
                    ? require('../assets/heart-filled.png')
                    : require('../assets/heart.png')
                }
                style={[styles.actionIcon, item.isLiked && styles.likedIcon]}
              />
              <Text style={styles.actionText}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openCommentModal(item.id)}>
              <Image
                source={require('../assets/comment.png')}
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>{item.comments.length}</Text>
            </TouchableOpacity>
          </View>
          {item.comments.length > 0 && (
            <View style={styles.commentsPreview}>
              <Text style={styles.commentsTitle}>
                {item.comments.length > 1
                  ? `View all ${item.comments.length} comments`
                  : 'View comment'}
              </Text>
              {item.comments.slice(0, 1).map(comment => (
                <View key={comment.id} style={styles.commentPreview}>
                  <Text style={styles.commentUserName}>{comment.userName}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Novo Run Community</Text>
          <Text style={styles.headerSubtitle}>
            Please adhere to community guidelines...
          </Text>
          <Text style={styles.headerSubtitle}>
            Don't post anything offensive. Happy Running!
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}>
          <Image source={require('../assets/add.png')} style={styles.addIcon} />
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color="#001965"
              style={styles.loader}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <TouchableOpacity
                style={styles.createFirstPostButton}
                onPress={() => setModalVisible(true)}>
                <Text style={styles.createFirstPostText}>
                  Create the first post
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore && !refreshing ? (
            <ActivityIndicator
              size="large"
              color="#001965"
              style={styles.loader}
            />
          ) : null
        }
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setCaption('');
                  setSelectedImage(null);
                }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={openImagePicker}>
              {selectedImage ? (
                <Image
                  source={{uri: selectedImage}}
                  style={styles.selectedImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Image
                    source={require('../assets/add.png')}
                    style={styles.cameraIcon}
                  />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.postButton,
                (!caption.trim() || !selectedImage || postSubmitting) &&
                  styles.disabledButton,
              ]}
              onPress={createPost}
              disabled={!caption.trim() || !selectedImage || postSubmitting}>
              {postSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={imagePickerModalVisible}
        onRequestClose={() => setImagePickerModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.imagePickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Image Source</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImagePickerModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.imagePickerOptions}>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={takePhoto}>
                <Image
                  source={require('../assets/camera.png')}
                  style={styles.imagePickerIcon}
                />
                <Text style={styles.imagePickerText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imagePickerOption}
                onPress={pickImageFromGallery}>
                <Image
                  source={require('../assets/gallery.png')}
                  style={styles.imagePickerIcon}
                />
                <Text style={styles.imagePickerText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentModalVisible}
        onRequestClose={() => setCommentModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setCommentModalVisible(false);
                  setCommentText('');
                  setCurrentPostId(null);
                }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                currentPostId
                  ? posts.find(post => post.id === currentPostId)?.comments ||
                    []
                  : []
              }
              renderItem={({item, index}) => (
                <View
                  style={styles.commentItem}
                  key={`comment-${item.id || index}`}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUserName}>{item.userName}</Text>
                    {item.userId === userContext?.userId && (
                      <TouchableOpacity
                        onPress={() => {
                          if (currentPostId) {
                            deleteComment(currentPostId, item.id);
                          }
                        }}>
                        <Image
                          source={require('../assets/trash.png')}
                          style={styles.deleteIcon}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              keyExtractor={(item, index) => item.id || `comment-${index}`}
              contentContainerStyle={styles.commentsList}
              ListEmptyComponent={
                <View style={styles.emptyCommentsContainer}>
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                </View>
              }
            />
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentText.trim() || commenting) && styles.disabledButton,
                ]}
                onPress={addComment}
                disabled={!commentText.trim() || commenting}>
                {commenting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Image
                    source={require('../assets/sendicon.png')}
                    style={styles.sendIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001965',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#001965',
    marginTop: 4,
  },
  addButton: {
    padding: 8,
  },
  addIcon: {
    width: 24,
    height: 24,
    tintColor: '#001965',
  },
  postsList: {
    padding: 8,
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  postDate: {
    fontSize: 12,
    color: '#757575',
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
    fontSize: 14,
    color: '#333333',
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    width: 24,
    height: 24,
    tintColor: '#757575',
    marginRight: 4,
  },
  likedIcon: {
    tintColor: '#E91E63',
    width: 22,
    height: 22,
  },
  actionText: {
    fontSize: 14,
    color: '#757575',
  },
  commentsPreview: {
    marginTop: 8,
  },
  commentsTitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  commentPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginBottom: 12,
  },
  createFirstPostButton: {
    backgroundColor: '#001965',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  createFirstPostText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    color: '#333333',
    fontWeight: 'bold',
  },
  captionInput: {
    padding: 16,
    fontSize: 16,
    color: '#333333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    margin: 16,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 40,
    height: 40,
    tintColor: '#757575',
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#757575',
  },
  postButton: {
    backgroundColor: '#001965',
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  deleteIcon: {
    width: 16,
    height: 16,
    tintColor: '#E91E63',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#001965',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  imagePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  imagePickerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  imagePickerOption: {
    alignItems: 'center',
    padding: 16,
    width: 120,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  imagePickerIcon: {
    width: 40,
    height: 40,
    tintColor: '#001965',
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
});

export default CommunityScreen;
