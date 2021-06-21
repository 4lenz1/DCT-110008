import { State } from './todo-list.reducer';
import { Store } from '@ngrx/store';
import { switchMap, startWith, filter, distinctUntilChanged, debounceTime, map, shareReplay, tap, finalize, catchError } from 'rxjs/operators';
import { Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TodoItemStatusChangeEvent } from './todo-item-status-change-event';
import { PageChangeEvent } from './page-change-event';
import { SortChangeEvent } from './sort-change-event';
import { TodoListAddDialogComponent } from './todo-list-add-dialog/todo-list-add-dialog.component';
import { TodoListService } from './todo-list.service';
import { TodoItem } from './todo-item';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as TodoListActions from './todo-list.actions';
import * as TodoListSelectors from './todo-list.selectors';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css'],
})
export class TodoListComponent implements OnInit {
  suggestList$ = this.store.select(TodoListSelectors.selectSuggestList).pipe(
    startWith([])
  );

  searchKeyword$ = new BehaviorSubject<string>('');
  sort$ = new BehaviorSubject<SortChangeEvent>({
    sortColumn: 'created',
    sortDirection: 'desc'
  });
  pagination$ = new BehaviorSubject<PageChangeEvent>({
    pageNumber: 1,
    pageSize: 10
  });

  todoListQuery$ = combineLatest([
    this.searchKeyword$,
    this.pagination$,
    this.sort$
  ]);

  todoItems$ = this.store.select(TodoListSelectors.selectTodoItemsData).pipe(
    startWith([])
  );

  totalCount$ = this.store.select(TodoListSelectors.selectTodoItemsTotalCount).pipe(
    startWith(0)
  );

  loading$ = this.store.select(TodoListSelectors.selectLoadingState);

  totalCount = 0;
  todoList: TodoItem[] = [];

  keyword = '';
  sort: SortChangeEvent = {
    sortColumn: 'created',
    sortDirection: 'desc'
  };
  pagination: PageChangeEvent = {
    pageNumber: 1,
    pageSize: 10
  };

  loading = false;

  constructor(
    private store: Store,
    private todoListService: TodoListService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // this.store.dispatch(TodoListActions.initTodoListItems());
    this.store.dispatch(TodoListActions.updateTodoListItems({
      totalCount: 2,
      data: [
        { id: '1', text: 'Task 1', done: true, created: (new Date()).getTime() },
        { id: '2', text: 'Task 2', done: false, created: (new Date()).getTime() }
      ]
    }));

    this.todoListQuery$.subscribe(([keyword, pagination, sort]) => {
      this.store.dispatch(TodoListActions.queryTodoItems({
        keyword,
        pagination,
        sort
      }));
    });

    this
      .store
      .select(TodoListSelectors.selectErrorMessageState)
      .pipe(filter(message => !!message))
      .subscribe(message => {
        alert(message);
      });
  }

  setSuggestList(keyword: string) {
    this.store.dispatch(TodoListActions.querySuggestList({ keyword }));
  }

  sortChange(event: SortChangeEvent) {
    this.sort$.next(event);
  }

  refresh() {
    this.searchKeyword$.next(this.searchKeyword$.value);
  }

  pageChange(event: PageChangeEvent) {
    this.pagination$.next({
      pageNumber: event.pageNumber + 1,
      pageSize: event.pageSize
    });
  }

  displayTodoDialog() {
    this.dialog
      .open(TodoListAddDialogComponent)
      .afterClosed()
      .pipe(
        filter(text => text !== ''),
        switchMap(text => this.todoListService.addTodo(text))
      )
      .subscribe(() => {
        this.refresh();
      });
  }

  resetSortAndPage() {
    this.sort$.next({
      sortColumn: 'created',
      sortDirection: 'desc'
    });
    this.pagination$.next({
      pageNumber: 1,
      pageSize: 10
    });
  }

  search(keyword: string) {
    this.resetSortAndPage();
    this.searchKeyword$.next(keyword || '');
  }

  todoItemStatusChange(status: TodoItemStatusChangeEvent) {
    this.todoListService
      .updateTodoDoneStatus(status.id, status.done)
      .subscribe((item) => {
        this.refresh();
      });
  }

  todoItemDelete(id: string) {
    this.todoListService.deleteTodoItem(id).subscribe(() => {
      this.refresh();
    });
  }
}
