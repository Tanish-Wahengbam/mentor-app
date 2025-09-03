import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CalendarComponent } from './calendar.component';

type Priority = 'low' | 'medium' | 'high';


interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  assignee?: string;
  estimatedTimeHours?: number;
  scheduleDate?: string | null;
  type?: string;
}
interface TaskType {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  forTasks: boolean;
  forEvents: boolean;
}
interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule, CalendarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  activeTool: 'tasks' | 'calendar' = 'tasks';
  columns: Column[] = [];
  showTaskModal = false;
  taskForm: FormGroup;
  currentColumn: Column | null = null;
  editingTask: Task | null = null;
  selectedStatusId: string | null = null;
  sidenavOpen = true;

  showEditTypesModal = false;
  taskTypes: TaskType[] = [
    { id: 'operational', name: 'Operational', color: '#2f6fec', enabled: true, forTasks: true, forEvents: false },
    { id: 'technical', name: 'Technical', color: '#17a2b8', enabled: true, forTasks: true, forEvents: false },
    { id: 'strategic', name: 'Strategic', color: '#28a745', enabled: true, forTasks: true, forEvents: false },
    { id: 'hiring', name: 'Hiring', color: '#6f42c1', enabled: true, forTasks: true, forEvents: false },
    { id: 'financial', name: 'Financial', color: '#ffc107', enabled: true, forTasks: true, forEvents: false },
    { id: 'meeting', name: 'Meeting', color: '#fd7e14', enabled: false, forTasks: false, forEvents: true },
    { id: 'online-call', name: 'Online call', color: '#6610f2', enabled: false, forTasks: false, forEvents: true },
    { id: 'interview', name: 'Interview', color: '#e83e8c', enabled: false, forTasks: false, forEvents: true },
    { id: 'type1', name: 'Type 1', color: '#fd7e14', enabled: false, forTasks: false, forEvents: true },
    { id: 'type2', name: 'Type 2', color: '#20c997', enabled: false, forTasks: false, forEvents: true }
  ];
  showTypeDropdown = false;
  editTypesActiveTab = 'tasks'; // Track active tab

  constructor(private fb: FormBuilder) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['medium', Validators.required],
      dueDate: [null, [Validators.required, this.futureDateValidator()]],
      assignee: ['', [Validators.minLength(2), Validators.maxLength(50)]],
      statusId: [null],
      estimatedTimeHours: [0, [Validators.min(0)]],
      scheduleDate: [null],
      type: ['operational', Validators.required]
    });
  }

  ngOnInit() {
    this.loadTaskTypes();
    this.initializeBoard();
    this.loadFromLocalStorage();
  }

  initializeBoard() {
    const defaultColumns: Column[] = [
      { id: 'new', title: 'New task', tasks: [] },
      { id: 'scheduled', title: 'Scheduled', tasks: [] },
      { id: 'inprogress', title: 'In Progress', tasks: [] },
      { id: 'completed', title: 'Completed', tasks: [] },
    ];
    this.columns = defaultColumns;
  }

  loadFromLocalStorage() {
    const savedBoard = localStorage.getItem('kanbanBoard');
    if (savedBoard) {
      this.columns = JSON.parse(savedBoard);
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('kanbanBoard', JSON.stringify(this.columns));
  }

  trackByTypeId(index: number, type: TaskType): string {
    return type.id;
  }
  getTaskTypeColor(task: Task): string {
    const taskType = this.taskTypes.find(t => t.id === (task.type || 'operational'));
    return taskType ? taskType.color : '#2f6fec';
  }

  getTaskTypeName(task: Task): string {
    const taskType = this.taskTypes.find(t => t.id === (task.type || 'operational'));
    return taskType ? taskType.name : 'Operational';
  }

  // Helper to get lighter version of color for background
  getTaskTypeBackgroundColor(task: Task): string {
    const color = this.getTaskTypeColor(task);
    // Convert hex to rgba with opacity
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }


  futureDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(control.value);
      return inputDate >= today ? null : { pastDate: true };
    };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.type-selector')) {
      this.showTypeDropdown = false;
    }
  }

  drop(event: CdkDragDrop<Task[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.saveToLocalStorage();
  }

  openNewTaskModal(column: Column) {
    this.currentColumn = column;
    this.editingTask = null;
    this.selectedStatusId = column.id;
    this.taskForm.reset({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: null,
      assignee: '',
      statusId: column.id,
      estimatedTimeHours: 0,
      scheduleDate: null,
      type: 'operational'
    });
    this.showTaskModal = true;
    document.body.classList.add('modal-open');
  }

  openAddNewModal() {
    this.currentColumn = null;
    this.editingTask = null;
    this.selectedStatusId = this.columns[0]?.id ?? null;
    this.taskForm.reset({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: null,
      assignee: '',
      statusId: this.selectedStatusId,
      estimatedTimeHours: 0,
      scheduleDate: null,
      type: 'operational'
    });
    this.showTaskModal = true;
    document.body.classList.add('modal-open');
  }

  editTask(task: Task, column: Column) {
    this.editingTask = task;
    this.currentColumn = column;
    this.selectedStatusId = column.id;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee ?? '',
      statusId: column.id,
      estimatedTimeHours: task.estimatedTimeHours ?? 0,
      scheduleDate: task.scheduleDate ?? null,
      type: task.type ?? 'operational' // Include type
    });
    this.showTaskModal = true;
    document.body.classList.add('modal-open');
  }

  saveTask() {
    if (this.taskForm.invalid) {
      Object.values(this.taskForm.controls).forEach(c => c.markAsTouched());
      return;
    }

    const v = this.taskForm.value;
    const destinationColumnId =
      this.currentColumn?.id ?? v.statusId ?? this.selectedStatusId ?? this.columns[0]?.id;

    let destinationColumn = this.columns.find(c => c.id === destinationColumnId);
    if (!destinationColumn) destinationColumn = this.columns[0];

    if (this.editingTask) {
      Object.assign(this.editingTask, {
        title: v.title,
        description: v.description,
        priority: v.priority,
        dueDate: v.dueDate,
        assignee: v.assignee,
        estimatedTimeHours: v.estimatedTimeHours,
        scheduleDate: v.scheduleDate,
        type: v.type // Make sure this is included
      });
    } else {
      const newTask: Task = {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        title: v.title,
        description: v.description,
        priority: v.priority,
        dueDate: v.dueDate,
        assignee: v.assignee,
        estimatedTimeHours: v.estimatedTimeHours,
        scheduleDate: v.scheduleDate,
        type: v.type // Make sure this is included
      };
      destinationColumn.tasks.push(newTask);
    }
    
    this.saveToLocalStorage();
    this.closeTaskModal();
  }


  closeTaskModal() {
    this.showTaskModal = false;
    this.editingTask = null;
    this.currentColumn = null;
    this.taskForm.reset();
    this.selectedStatusId = null;
    document.body.classList.remove('modal-open');
  }

  deleteTask(column: Column, task: Task) {
    const index = column.tasks.indexOf(task);
    if (index > -1) {
      column.tasks.splice(index, 1);
      this.saveToLocalStorage();
    }
  }

  openNewColumnModal() {
    const title = prompt('Enter column title:');
    if (title && title.trim()) {
      this.columns.push({
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        title: title.trim(),
        tasks: [],
      });
      this.saveToLocalStorage();
    }
  }

  deleteColumn(column: Column) {
    const idx = this.columns.indexOf(column);
    if (idx > -1) {
      this.columns.splice(idx, 1);
      this.saveToLocalStorage();
    }
  }

  updateColumnTitle(column: Column, e: Event) {
    const el = e.target as HTMLElement;
    column.title = el.textContent?.trim() ?? column.title;
    this.saveToLocalStorage();
  }

  toggleSidebar() {
    this.sidenavOpen = !this.sidenavOpen;
  }

  getSelectedTaskType() {
    const typeId = this.taskForm.get('type')?.value || 'operational';
    return this.taskTypes.find(t => t.id === typeId) || this.taskTypes[0];
  }

  getEnabledTaskTypes() {
    return this.taskTypes.filter(t => t.forTasks);
  }

  selectTaskType(type: TaskType) {
    this.taskForm.patchValue({ type: type.id });
    this.showTypeDropdown = false;
  }

  toggleTypeDropdown() {
    this.showTypeDropdown = !this.showTypeDropdown;
  }

  openEditTypesModal() {
    this.showEditTypesModal = true;
    this.showTypeDropdown = false;
    this.editTypesActiveTab = 'tasks';
    document.body.classList.add('modal-open');
  }

  closeEditTypesModal() {
    this.showEditTypesModal = false;
    document.body.classList.remove('modal-open');
  }

  toggleTypeEnabled(type: any) {
    type.enabled = !type.enabled;
  }

  setEditTypesTab(tab: string) {
    this.editTypesActiveTab = tab;
  }

  toggleTypeForTasks(type: TaskType) {
    type.forTasks = !type.forTasks;
    if (type.forTasks) {
      type.enabled = true;
    }
  }

  toggleTypeForEvents(type: TaskType) {
    type.forEvents = !type.forEvents;
  }

  updateTypeName(type: TaskType, newName: string) {
    type.name = newName.trim();
  }

  saveTaskTypes() {
    // Save to localStorage
    localStorage.setItem('taskTypes', JSON.stringify(this.taskTypes));
    this.closeEditTypesModal();
    console.log('Task types saved:', this.taskTypes);
  }

  loadTaskTypes() {
    const saved = localStorage.getItem('taskTypes');
    if (saved) {
      try {
        this.taskTypes = JSON.parse(saved);
        console.log('Task types loaded:', this.taskTypes);
      } catch (error) {
        console.error('Error loading task types:', error);
        // Keep default types if error
      }
    }
  }
}
