/**
 * Mentor Mate - Type-Safe API Client
 * Connects frontend to FastAPI backend (http://127.0.0.1:8000/api/v1)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  education_tier?: string;
  board_or_university?: string;
  goal?: string;
  field_of_study?: string;
  target_year?: number;
  daily_available_hours?: number;
  streak_days?: number;
}

export interface ScheduleTask {
  task_title: string;
  task_type: 'Study' | 'Revision' | 'Practice' | 'Project' | 'Deep Dive' | string;
  duration_minutes: number;
  details: string;
}

export interface ScheduleDay {
  day_number: number;
  day_label: string;
  focus_area: string;
  estimated_hours: number;
  tasks: ScheduleTask[];
}

export interface SchedulePlan {
  title: string;
  mode: 'resource' | 'general';
  time_range: string;
  total_days: number;
  field_of_study: string;
  summary: string;
  days: ScheduleDay[];
}

export interface ScheduleRecord {
  schedule_id?: string;
  id?: string;
  mode: 'resource' | 'general';
  time_range: string;
  field_of_study?: string;
  title?: string;
  created_at?: string;
  schedule: SchedulePlan;
  has_schedule?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  profile: {
    id: string;
    user_id: string;
    name: string;
    education_tier: string;
    board_or_university: string;
    goal: string;
    target_year: number;
    daily_available_hours: number;
    streak_days: number;
  };
}

export interface ResourceChunk {
  id: string;
  chunk_index: number;
  page_number?: number;
  slide_number?: number;
  section_title?: string;
  content: string;
}

export interface ResourceChunkEdit {
  id?: string;
  chunk_index: number;
  page_number?: number;
  slide_number?: number;
  section_title?: string;
  content: string;
}

export interface StudyFolder {
  id: string;
  name: string;
  subject: string;
  description?: string;
  resource_count: number;
  resources: ResourceItem[];
  created_at: string;
  updated_at: string;
}

export interface ResourceItem {
  id: string;
  folder_id?: string | null;
  title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  error_message?: string;
  subject: string;
  extracted_summary?: string;
  chunk_count: number;
  is_verified?: boolean;
  created_at: string;
  chunks?: ResourceChunk[];
}

export interface CitationRef {
  document_name: string;
  page_number?: number;
  slide_number?: number;
  section_title?: string;
  excerpt: string;
  relevance_score: number;
}

export interface ConversationOut {
  id: string;
  title: string;
  group_tag?: string | null;
  mode: string;
  resource_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageOut {
  id: string;
  conversation_id?: string;
  role: string;
  content: string;
  evidence_sufficient: boolean;
  citations: CitationRef[];
  created_at: string;
}

export interface AssessmentItemOut {
  id: string;
  question_number: number;
  question_type: 'mcq' | 'short_answer' | 'long_answer' | 'diagram';
  question_text: string;
  options?: string[];
  diagram_code?: string;
  diagram_type?: string;
  hints?: string[];
  rubric_hints?: string[];
}

export interface AssessmentStartRequest {
  mode?: 'field_of_study' | 'folder' | 'resource' | 'weakness';
  resource_id?: string;
  folder_id?: string;
  subject?: string;
  topic?: string;
  question_types?: string[];
  difficulty_mode?: 'adaptive' | 'foundational' | 'intermediate' | 'advanced';
  num_questions?: number;
}

export interface AssessmentStartResponse {
  assessment_id: string;
  title: string;
  subject: string;
  difficulty_mode?: string;
  total_questions: number;
  current_question: AssessmentItemOut;
}

export interface AssessmentAnswerOut {
  is_correct: boolean;
  score_awarded: number;
  correct_index?: number | null;
  ai_feedback?: string;
  explanation: string;
  error_type?: string;
  prior_p_l: number;
  posterior_p_l: number;
  is_complete: boolean;
  score: number;
  total_questions: number;
  next_question?: AssessmentItemOut;
}

export interface AssessmentConfigOptions {
  student_field: {
    name: string;
    tier: string;
    board: string;
    goal: string;
    suggested_subject: string;
  };
  current_mastery_pct?: number | null;
  supported_difficulties: Array<{
    id: string;
    label: string;
    badge: string;
    description: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    description?: string;
    resource_count: number;
  }>;
  resources: Array<{
    id: string;
    title: string;
    file_type: string;
    folder_id?: string;
    is_verified: boolean;
  }>;
  weak_concepts: Array<{
    concept_id: string;
    name: string;
    topic: string;
    mastery_percent: number;
  }>;
  supported_question_types: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export interface RevisionItemOut {
  id: string;
  concept_id?: string | null;
  concept_name?: string | null;
  topic_title?: string | null;
  subject?: string | null;
  topic?: string | null;
  revision_type: 'field_curriculum' | 'study_material';
  source_context?: string;
  resource_id?: string | null;
  folder_id?: string | null;

  flashcards?: Array<{ front: string; back: string; hint?: string }> | null;
  mindmap_code?: string | null;
  quick_summary?: string | null;
  speed_quiz?: Array<{ question: string; options: string[]; correct_answer: string; explanation: string }> | null;
  last_score?: number | null;
  half_life_days_h: number;
  stability_days_s: number;
  retention_estimate: number;
  last_reviewed_at: string;
  next_review_at: string;
  review_count: number;
  priority: string;
  is_at_risk?: boolean;
}

export interface AtRiskConceptOut {
  id: string;
  title: string;
  subject?: string | null;
  revision_type: string;
  retention_estimate: number;
  days_since_reviewed: number;
  urgency: 'critical' | 'fading' | string;
  concept_id?: string | null;
  source_context?: string | null;
}

export interface RevisionGenerateRequest {
  revision_type: 'field_curriculum' | 'study_material';
  topic_or_subject?: string;
  concept_id?: string;
  resource_id?: string;
  folder_id?: string;
  custom_focus?: string;
}

export interface DashboardData {
  has_data: boolean;
  student: {
    name: string;
    education_tier: string;
    goal: string;
    streak_days: number;
    daily_available_hours: number;
    days_to_exam: number;
  };
  metrics: {
    resource_count: number;
    assessments_completed: number;
    average_mastery_percent: number | null;
    due_revisions_count: number;
  };
  priority_focus: {
    concept_id?: string;
    concept_name?: string;
    title?: string;
    reason?: string;
    action?: string;
    urgency?: string;
    estimated_mastery?: number;
    estimated_retention?: number;
  } | null;
  at_risk_revisions?: Array<{
    id: string;
    title: string;
    subject?: string;
    revision_type: string;
    retention_percent: number;
    days_since_reviewed: number;
    urgency: string;
  }>;
  recent_assessments: Array<{
    id: string;
    title: string;
    score: number;
    total: number;
    percentage: number;
    proficiency_tier: string;
    latent_ability_theta: number;
    completed_at: string;
  }>;
}

export interface ConceptMasteryItem {
  concept_id: string;
  concept_name: string;
  topic: string;
  subject: string;
  mastery_percent: number;
  p_l: number;
  uncertainty: number;
  total_attempts: number;
  correct_attempts: number;
  status: 'Mastered' | 'Developing' | 'Needs Work';
  source?: string;
}

export interface DomainStrengthItem {
  domain: string;
  average_mastery: number;
  concept_count: number;
}

export interface AssessmentTrendItem {
  index: number;
  label: string;
  title: string;
  percentage: number;
  score: string;
  proficiency_tier: string;
  completed_at: string | null;
}

export interface PerformanceData {
  overall_mastery: number;
  proficiency_tier: string;
  tier_description: string;
  student: {
    name: string;
    field_of_study: string;
    streak_days: number;
    daily_hours: number;
  };
  stats: {
    assessments_completed: number;
    assessments_average_percent: number;
    revisions_count: number;
    average_retention_percent: number;
    concepts_tracked: number;
    mastered_concepts: number;
    in_progress_concepts: number;
    struggling_concepts: number;
    resources_uploaded: number;
    mentor_conversations: number;
    schedules_created: number;
  };
  assessment_trend: AssessmentTrendItem[];
  difficulty_breakdown: {
    adaptive: number;
    foundational: number;
    intermediate: number;
    advanced: number;
  };
  revisions_breakdown: {
    field_curriculum: number;
    study_material: number;
    high_retention: number;
    at_risk: number;
  };
  concepts: ConceptMasteryItem[];
  domain_strengths: DomainStrengthItem[];
  recommendations: string[];
}

export interface CourseLesson {
  lesson_id?: string;
  title: string;
  objective?: string;
  duration_minutes?: number;
  key_topics?: string[];
  theory_content?: string;
  code_snippet?: string;
  remedial_focus?: string;
  practice_prompt?: string;
  completed?: boolean;
}

export interface CourseModule {
  module_id?: string;
  title: string;
  description?: string;
  target_concept?: string;
  lessons?: CourseLesson[];
  lessons_count?: number;
  duration?: string;
  duration_hours?: number;
  checkpoint_quiz_topic?: string;
}

export interface CourseRecord {
  id: string;
  course_type?: 'personalized' | 'open_source';
  title: string;
  field_of_study: string;
  description?: string;
  level: string;
  estimated_hours: number;
  modules: CourseModule[];
  weak_areas_addressed?: string[];
  data_sources_used?: Record<string, any>;
  prerequisites?: string[];
  external_url?: string;
  github_stars?: number;
  source_platform?: string;
  tags?: string[];
  status?: string;
  created_at?: string;
}

export interface CourseChecklistItem {
  key: string;
  title: string;
  status: 'ready' | 'missing' | 'pending';
  description: string;
  action_view: string;
}

export interface CourseReadinessResponse {
  is_ready: boolean;
  field_of_study: string;
  checklist: CourseChecklistItem[];
  guidance_message: string;
  metrics: {
    resources_count: number;
    completed_tests: number;
    incorrect_answers: number;
    weak_areas_count: number;
    weak_areas: string[];
    resource_titles: string[];
  };
}

class ApiClient {


  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('mentormate_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('mentormate_token', token);
      } else {
        localStorage.removeItem('mentormate_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('mentormate_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Health
  async checkHealth() {
    return this.request<{ status: string; services: Record<string, any> }>('/health');
  }

  // Auth
  async register(data: {
    email: string;
    password: string;
    name: string;
    education_tier?: string;
    board_or_university?: string;
    goal?: string;
    target_year?: number;
    daily_available_hours?: number;
  }): Promise<{ access_token: string; user: User }> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    const userObj: User = {
      id: res.user.id,
      email: res.user.email,
      role: res.user.role,
      name: res.profile.name,
      education_tier: res.profile.education_tier,
      board_or_university: res.profile.board_or_university,
      goal: res.profile.goal,
      target_year: res.profile.target_year,
      daily_available_hours: res.profile.daily_available_hours,
      streak_days: res.profile.streak_days,
    };
    return { access_token: res.access_token, user: userObj };
  }

  async login(data: { email: string; password: string }): Promise<{ access_token: string; user: User }> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    const userObj: User = {
      id: res.user.id,
      email: res.user.email,
      role: res.user.role,
      name: res.profile.name,
      education_tier: res.profile.education_tier,
      board_or_university: res.profile.board_or_university,
      goal: res.profile.goal,
      target_year: res.profile.target_year,
      daily_available_hours: res.profile.daily_available_hours,
      streak_days: res.profile.streak_days,
    };
    return { access_token: res.access_token, user: userObj };
  }

  async getCurrentUser(): Promise<User> {
    const res = await this.request<{ user: { id: string; email: string; role: string }; profile: any }>('/auth/me');
    return {
      id: res.user.id,
      email: res.user.email,
      role: res.user.role,
      name: res.profile.name,
      education_tier: res.profile.education_tier,
      board_or_university: res.profile.board,
      goal: res.profile.goal,
      target_year: res.profile.target_year,
      daily_available_hours: res.profile.daily_available_hours,
      streak_days: res.profile.streak_days,
    };
  }

  logout() {
    this.setToken(null);
  }

  async updateProfile(data: {
    name?: string;
    education_tier?: string;
    board_or_university?: string;
    goal?: string;
    daily_available_hours?: number;
    days_to_exam?: number | null;
  }): Promise<any> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Resources & Folders
  async listResources(folderId?: string): Promise<ResourceItem[]> {
    const url = folderId ? `/resources?folder_id=${encodeURIComponent(folderId)}` : '/resources';
    return this.request<ResourceItem[]>(url);
  }

  async getResource(id: string): Promise<ResourceItem> {
    return this.request<ResourceItem>(`/resources/${id}`);
  }

  async uploadResource(file: File, title?: string, subject?: string, folderId?: string): Promise<ResourceItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (subject) formData.append('subject', subject);
    if (folderId) formData.append('folder_id', folderId);
    return this.request<ResourceItem>('/resources/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteResource(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/resources/${id}`, {
      method: 'DELETE',
    });
  }

  async listFolders(): Promise<StudyFolder[]> {
    return this.request<StudyFolder[]>('/resources/folders');
  }

  async createFolder(data: { name: string; subject?: string; description?: string }): Promise<StudyFolder> {
    return this.request<StudyFolder>('/resources/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFolder(folderId: string, data: { name?: string; subject?: string; description?: string }): Promise<StudyFolder> {
    return this.request<StudyFolder>(`/resources/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(folderId: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/resources/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  async assignResourceFolder(resourceId: string, folderId: string | null): Promise<{ message: string; resource_id: string; folder_id: string | null }> {
    return this.request(`/resources/${resourceId}/folder`, {
      method: 'PUT',
      body: JSON.stringify({ folder_id: folderId }),
    });
  }

  async updateResourceChunks(resourceId: string, chunks: ResourceChunkEdit[]): Promise<{ message: string; resource_id: string; is_verified: boolean; chunk_count: number }> {
    return this.request(`/resources/${resourceId}/chunks`, {
      method: 'PUT',
      body: JSON.stringify({ chunks }),
    });
  }

  getResourceFileUrl(resourceId: string): string {
    const token = this.getToken();
    return `${API_BASE}/resources/${resourceId}/file${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  // Resource AI (Strict Grounded RAG)
  async queryResourceAI(data: { message: string; resource_id?: string; folder_id?: string; conversation_id?: string }): Promise<ChatMessageOut> {
    return this.request<ChatMessageOut>('/resource-ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getResourceConversations(): Promise<ConversationOut[]> {
    return this.request<ConversationOut[]>('/resource-ai/conversations');
  }

  async getResourceMessages(conversationId: string): Promise<ChatMessageOut[]> {
    return this.request<ChatMessageOut[]>(`/resource-ai/conversations/${conversationId}/messages`);
  }

  async updateResourceConversation(conversationId: string, data: { title?: string; group_tag?: string }): Promise<ConversationOut> {
    return this.request<ConversationOut>(`/resource-ai/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteResourceConversation(conversationId: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/resource-ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Ask Mentor (Socratic AI Tutor)
  async askMentor(data: { message: string; conversation_id?: string; resource_id?: string }): Promise<ChatMessageOut> {
    return this.request<ChatMessageOut>('/mentor/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMentorConversations(): Promise<ConversationOut[]> {
    return this.request<ConversationOut[]>('/mentor/conversations');
  }

  async getMentorMessages(conversationId: string): Promise<ChatMessageOut[]> {
    return this.request<ChatMessageOut[]>(`/mentor/conversations/${conversationId}/messages`);
  }

  async updateMentorConversation(conversationId: string, data: { title?: string; group_tag?: string }): Promise<ConversationOut> {
    return this.request<ConversationOut>(`/mentor/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMentorConversation(conversationId: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/mentor/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Assessments & Dynamic Testing
  async getAssessmentConfigOptions(): Promise<AssessmentConfigOptions> {
    return this.request<AssessmentConfigOptions>('/assessments/config-options');
  }

  async startAssessment(data: AssessmentStartRequest = {}): Promise<AssessmentStartResponse> {
    return this.request<AssessmentStartResponse>('/assessments/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitAssessmentAnswer(
    assessmentId: string,
    data: {
      item_id: string;
      selected_index?: number | null;
      text_response?: string;
      response_time_ms?: number;
    }
  ): Promise<AssessmentAnswerOut> {
    return this.request<AssessmentAnswerOut>(`/assessments/${assessmentId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Spaced Revision (Ebbinghaus) & Dual-Type Revision System
  async getDueRevisions(): Promise<RevisionItemOut[]> {
    return this.request<RevisionItemOut[]>('/revision/due');
  }

  async getRevisionItems(revisionType?: 'field_curriculum' | 'study_material'): Promise<RevisionItemOut[]> {
    const url = revisionType ? `/revision/items?revision_type=${encodeURIComponent(revisionType)}` : '/revision/items';
    return this.request<RevisionItemOut[]>(url);
  }

  async getDecayAlerts(): Promise<AtRiskConceptOut[]> {
    return this.request<AtRiskConceptOut[]>('/revision/decay-alerts');
  }

  async generateRevision(data: RevisionGenerateRequest): Promise<RevisionItemOut> {
    return this.request<RevisionItemOut>('/revision/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRevisionItem(revisionId: string): Promise<RevisionItemOut> {
    return this.request<RevisionItemOut>(`/revision/${revisionId}`);
  }

  async completeRevisionReview(
    revisionId: string,
    options: {
      isRemembered?: boolean;
      score?: number;
      difficulty_rating?: 'again' | 'hard' | 'good' | 'easy';
    } | boolean = true
  ): Promise<{
    message: string;
    new_half_life_days?: number;
    new_stability_days: number;
    next_review_at: string;
  }> {
    const payload = typeof options === 'boolean'
      ? { is_remembered: options }
      : {
          is_remembered: options.isRemembered ?? true,
          score: options.score,
          difficulty_rating: options.difficulty_rating,
        };

    return this.request<{
      message: string;
      new_half_life_days?: number;
      new_stability_days: number;
      next_review_at: string;
    }>(`/revision/${revisionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }


  // Knowledge Modeling (BKT + IRT) & Comprehensive Performance
  async getPerformance(): Promise<PerformanceData> {
    return this.request<PerformanceData>('/mastery/performance');
  }

  async getStudentPerformance(userId: string): Promise<PerformanceData> {
    return this.request<PerformanceData>(`/students/${userId}/performance`);
  }

  async getKnowledgeStates(): Promise<any> {
    return this.request<any>('/knowledge/states');
  }


  // OpenClaw Study Planner Agent
  async createStudyPlan(goal?: string): Promise<any> {
    return this.request<any>('/knowledge/study-plan', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
  }

  async getStudyPlan(): Promise<any> {
    return this.request<any>('/knowledge/study-plan');
  }

  // OpenClaw Knowledge Analysis Agent
  async getKnowledgeAnalysis(): Promise<any> {
    return this.request<any>('/knowledge/analysis');
  }

  // OpenClaw Assessment Generation Agent
  async generateAgentAssessment(subject = "Physics", topic?: string): Promise<any> {
    return this.request<any>('/assessments/generate-agent', {
      method: 'POST',
      body: JSON.stringify({ subject, topic }),
    });
  }

  // OpenClaw Revision Challenge Agent
  async getAgentRevisionChallenge(revisionId: string): Promise<any> {
    return this.request<any>(`/revision/agent-challenge?revision_id=${encodeURIComponent(revisionId)}`);
  }

  async submitAgentRevisionChallenge(revisionId: string, answer: string): Promise<any> {
    return this.request<any>('/revision/agent-challenge', {
      method: 'POST',
      body: JSON.stringify({ revision_id: revisionId, answer }),
    });
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>('/dashboard');
  }

  // Study Schedules (Persisted in DB)
  async getLatestSchedule(mode?: 'resource' | 'general'): Promise<ScheduleRecord> {
    const url = mode ? `/schedule/latest?mode=${mode}` : '/schedule/latest';
    return this.request<ScheduleRecord>(url);
  }

  async getAllSchedules(): Promise<ScheduleRecord[]> {
    return this.request<ScheduleRecord[]>('/schedule/all');
  }

  async generateSchedule(params: {
    mode: 'resource' | 'general';
    time_range: '3_days' | '1_week' | '2_weeks' | '1_month';
    field_of_study?: string;
  }): Promise<ScheduleRecord> {
    return this.request<ScheduleRecord>('/schedule/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/schedule/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  // Courses (Personalized & Open Source)
  async getCourseReadiness(): Promise<CourseReadinessResponse> {
    return this.request<CourseReadinessResponse>('/courses/readiness');
  }

  async getPersonalizedCourses(): Promise<CourseRecord[]> {
    return this.request<CourseRecord[]>('/courses/personalized');
  }

  async generatePersonalizedCourse(customFocus?: string): Promise<CourseRecord> {
    return this.request<CourseRecord>('/courses/personalized/generate', {
      method: 'POST',
      body: JSON.stringify({ custom_focus: customFocus }),
    });
  }

  async getOpenSourceCourses(params?: { force_refresh?: boolean; field_of_study?: string }): Promise<CourseRecord[]> {
    const query = new URLSearchParams();
    if (params?.force_refresh) query.set('force_refresh', 'true');
    if (params?.field_of_study) query.set('field_of_study', params.field_of_study);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<CourseRecord[]>(`/courses/open-source${qs}`);
  }

  async syncOpenSourceCourses(fieldOfStudy?: string): Promise<CourseRecord[]> {
    return this.request<CourseRecord[]>('/courses/open-source/sync', {
      method: 'POST',
      body: JSON.stringify({ field_of_study: fieldOfStudy }),
    });
  }

  async getCourseDetails(courseId: string): Promise<CourseRecord> {
    return this.request<CourseRecord>(`/courses/${courseId}`);
  }

  async deleteCourse(courseId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async toggleLessonCompletion(courseId: string, lessonId: string): Promise<CourseRecord> {
    return this.request<CourseRecord>(`/courses/${courseId}/lessons/${encodeURIComponent(lessonId)}/toggle`, {
      method: 'PATCH',
    });
  }
}


export const api = new ApiClient();
