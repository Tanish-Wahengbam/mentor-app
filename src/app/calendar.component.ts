import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

interface CalendarTask {
  id: string;
  title: string;
  dayIndex: number; // 0=Mon ... 6=Sun
  typeId: string;
  durationMinutes: number;
}

@Component({
  standalone: true,
  selector: 'app-calendar',
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
  weekStart = this.getStartOfWeek(new Date());
  days = this.buildDays(this.weekStart);
  dayTasks: CalendarTask[][] = Array.from({ length: 7 }).map(() => []);

  // Date picker state
  showDatePicker = false;
  monthCursor = this.getMonthStart(new Date());

  // Simple type catalog
  types = [
    { id: 'operational', name: 'Operational', color: '#2f6fec' },
    { id: 'technical', name: 'Technical', color: '#17a2b8' },
    { id: 'strategic', name: 'Strategic', color: '#28a745' },
    { id: 'hiring', name: 'Hiring', color: '#6f42c1' },
    { id: 'financial', name: 'Financial', color: '#ffc107' },
    { id: 'meeting', name: 'Meeting', color: '#fd7e14' },
    { id: 'interview', name: 'Interview', color: '#e83e8c' }
  ];

  // Add/Edit task modal
  showTaskModal = false;
  modalDayIndex: number = 0;
  editingIndex: number | null = null;
  formTitle = '';
  formDuration = 15;
  formTypeId = 'operational';

  constructor() {
    this.refreshCalendarFromStorage();
  }

  get dayDropListIds(): string[] {
    return Array.from({ length: 7 }).map((_, i) => `day-${i}`);
  }

  onDrop(event: CdkDragDrop<CalendarTask[]>, targetDayIndex: number) {
    const droppedTask = event.item.data as CalendarTask;
    const oldDayIndex = droppedTask.dayIndex;
    
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      event.container.data.forEach(t => (t.dayIndex = targetDayIndex));
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      event.container.data.forEach(t => (t.dayIndex = targetDayIndex));
      const prevId = this.extractDayIndex(event.previousContainer.id);
      if (prevId !== null) {
        event.previousContainer.data.forEach(t => (t.dayIndex = prevId));
      }
    }
  
    // Update the calendar task's dayIndex
    droppedTask.dayIndex = targetDayIndex;
  
    // Update the original Kanban task's date if the day changed
    if (oldDayIndex !== targetDayIndex) {
      this.updateKanbanTaskDate(droppedTask, targetDayIndex);
    }
  }
  
  private updateKanbanTaskDate(calendarTask: CalendarTask, newDayIndex: number) {
    try {
      const raw = localStorage.getItem('kanbanBoard');
      if (!raw) return;
  
      const columns = JSON.parse(raw);
      let taskFound = false;
  
      // Calculate the new date based on week start and day index
      const newDate = new Date(this.weekStart);
      newDate.setDate(this.weekStart.getDate() + newDayIndex);
      const newDateISO = newDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
      // Find and update the task in the Kanban data
      for (const column of columns) {
        if (column.tasks) {
          for (const task of column.tasks) {
            if (String(task.id) === calendarTask.id) {
              // Update the scheduleDate or dueDate
              if (task.scheduleDate !== undefined) {
                task.scheduleDate = newDateISO;
              } else {
                task.dueDate = newDateISO;
              }
              taskFound = true;
              console.log(`✅ Updated task "${task.title}" to ${newDateISO}`);
              break;
            }
          }
        }
        if (taskFound) break;
      }
  
      if (taskFound) {
        // Save the updated data back to localStorage
        localStorage.setItem('kanbanBoard', JSON.stringify(columns));
      }
  
    } catch (e) {
      console.error('Failed to update Kanban task date:', e);
    }
  }
  

  private showUpdateNotification(taskTitle: string, newDate: string) {
    console.log(`✅ Updated "${taskTitle}" to ${newDate}`);
  }

  extractDayIndex(id: string): number | null {
    const match = id.match(/day-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  prevWeek() {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() - 7);
    this.setWeek(d);
  }

  nextWeek() {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + 7);
    this.setWeek(d);
  }

  today() {
    this.setWeek(new Date());
  }

  private setWeek(date: Date) {
    this.weekStart = this.getStartOfWeek(date);
    this.days = this.buildDays(this.weekStart);
    this.refreshCalendarFromStorage();
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Mon=0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private buildDays(start: Date) {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  // Date picker helpers
  toggleDatePicker() {
    this.showDatePicker = !this.showDatePicker;
  }

  private getMonthStart(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  get monthLabel(): string {
    return this.monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    const d = new Date(this.monthCursor);
    d.setMonth(d.getMonth() - 1);
    this.monthCursor = this.getMonthStart(d);
  }

  nextMonth() {
    const d = new Date(this.monthCursor);
    d.setMonth(d.getMonth() + 1);
    this.monthCursor = this.getMonthStart(d);
  }

  get monthGrid(): Date[] {
    const first = new Date(this.monthCursor);
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startDow);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  isSameMonth(d: Date): boolean {
    return d.getMonth() === this.monthCursor.getMonth() && d.getFullYear() === this.monthCursor.getFullYear();
  }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  selectDate(d: Date) {
    this.setWeek(d);
    this.monthCursor = this.getMonthStart(d);
    this.showDatePicker = false;
  }

  openAddTask(dayIndex: number) {
    this.modalDayIndex = dayIndex;
    this.editingIndex = null;
    this.formTitle = '';
    this.formDuration = 15;
    this.formTypeId = 'operational';
    this.showTaskModal = true;
    document.body.classList.add('modal-open');
  }

  openEditTask(task: CalendarTask, dayIndex: number, index: number) {
    this.modalDayIndex = dayIndex;
    this.editingIndex = index;
    this.formTitle = task.title;
    this.formDuration = task.durationMinutes;
    this.formTypeId = task.typeId;
    this.showTaskModal = true;
    document.body.classList.add('modal-open');
  }

  saveTaskFromModal() {
    const title = this.formTitle.trim();
    if (!title) { return; }
    
    if (this.editingIndex === null) {
      const newTask: CalendarTask = {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        title,
        dayIndex: this.modalDayIndex,
        typeId: this.formTypeId,
        durationMinutes: Math.max(1, Math.floor(this.formDuration))
      };
      this.dayTasks[this.modalDayIndex].push(newTask);
    } else {
      const t = this.dayTasks[this.modalDayIndex][this.editingIndex];
      if (t) {
        t.title = title;
        t.durationMinutes = Math.max(1, Math.floor(this.formDuration));
        t.typeId = this.formTypeId;
      }
    }
    this.closeTaskModal();
  }

  closeTaskModal() {
    this.showTaskModal = false;
    document.body.classList.remove('modal-open');
  }

  deleteTask(dayIndex: number, taskIndex: number) {
    if (confirm('Delete this task?')) {
      this.dayTasks[dayIndex].splice(taskIndex, 1);
    }
  }

  getTypeColor(typeId: string): string {
    return this.types.find(t => t.id === typeId)?.color || '#2f6fec';
  }

  getTypeName(typeId: string): string {
    return this.types.find(t => t.id === typeId)?.name || 'Operational';
  }

  trackByTaskId(index: number, task: CalendarTask): string {
    return task.id;
  }

  // Load tasks from Kanban localStorage and populate days by date
  refreshCalendarFromStorage() {
    this.dayTasks = Array.from({ length: 7 }).map(() => []);
    try {
      const raw = localStorage.getItem('kanbanBoard');
      if (!raw) return;
      
      const columns = JSON.parse(raw) as Array<{ id: string; title: string; tasks: any[] }>;
      const all = columns.flatMap(c => c.tasks || []);
      const start = this.weekStart;
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      
      for (const t of all) {
        const dateStr: string | null = t.scheduleDate || t.dueDate || null;
        if (!dateStr) continue;
        
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) continue;
        
        if (d >= start && d < end) {
          const idx = Math.floor((d.getTime() - start.getTime()) / 86400000);
          if (idx >= 0 && idx < 7) {
            const ct: CalendarTask = {
              id: String(t.id ?? crypto.randomUUID?.() ?? Date.now()),
              title: String(t.title ?? 'Untitled'),
              dayIndex: idx,
              typeId: String(t.type ?? 'operational'),
              durationMinutes: Number(t.estimatedTimeHours ? t.estimatedTimeHours * 60 : 15)
            };
            this.dayTasks[idx].push(ct);
          }
        }
      }
    } catch (e) {
      console.error('Calendar: failed to read kanban tasks', e);
    }
  }

  // Format date for display
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Optional: Add method to sync all changes back to Kanban
  syncToKanban() {
    try {
      const raw = localStorage.getItem('kanbanBoard');
      if (!raw) return;

      const columns = JSON.parse(raw) as Array<{ id: string; title: string; tasks: any[] }>;
      
      // Update all tasks in dayTasks back to kanban
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        for (const calendarTask of this.dayTasks[dayIndex]) {
          const newDate = new Date(this.weekStart);
          newDate.setDate(this.weekStart.getDate() + dayIndex);
          const newDateISO = newDate.toISOString().split('T')[0];

          for (const column of columns) {
            for (const task of column.tasks || []) {
              if (String(task.id) === calendarTask.id) {
                if (task.scheduleDate) {
                  task.scheduleDate = newDateISO;
                } else if (task.dueDate) {
                  task.dueDate = newDateISO;
                } else {
                  task.scheduleDate = newDateISO;
                }
                break;
              }
            }
          }
        }
      }

      localStorage.setItem('kanbanBoard', JSON.stringify(columns));
      console.log('Synced all calendar changes back to Kanban');

    } catch (e) {
      console.error('Failed to sync calendar to Kanban:', e);
    }
  }
}
