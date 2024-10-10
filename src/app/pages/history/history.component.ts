import { Component, Input, OnInit } from '@angular/core';
import { NgZorroModule } from '../../../shared/ng-zorro.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectionService } from '../selection.service';
import { ModalComponent } from '../modal/modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AppointmentService } from '../../appointment.service';
import { Modal2Component } from '../modal2/modal2.component';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [NgZorroModule, CommonModule, FormsModule,NzModalModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  selectedData: any[] = [];
  filteredData: any[] = [];
  appointmentDetails: any = null;
  searchText: string = ''; // ตัวแปรสำหรับเก็บค่าค้นหา

  constructor(
    private selectionService: SelectionService,
    private modal: NzModalService,
    private appointmentService: AppointmentService,
  ) { }

  ngOnInit(): void {
    this.loadConfirmedAppointments();
  }

  loadConfirmedAppointments(): void {
    this.appointmentService.getConfirmedAppointments().subscribe(
      (data) => {
        this.selectedData = data;
        this.filteredData = [...this.selectedData];
      },
      (error) => {
        console.error('Error loading confirmed appointments:', error);
      }
    );
  }

  filterData(): void {
    const searchTerm = this.searchText.toLowerCase().trim();

    this.filteredData = this.selectedData.filter(item => {
      const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
      return (
        fullName.includes(searchTerm) ||
        item.id_card?.toLowerCase().includes(searchTerm) ||
        item.phone?.toLowerCase().includes(searchTerm) ||
        item.first_name?.toLowerCase().includes(searchTerm) ||
        item.last_name?.toLowerCase().includes(searchTerm)
      );
    });

    console.log('Filtered Data:', this.filteredData);
  }

  viewData(data: any): void {
    const modal = this.modal.create({
      nzTitle: 'ข้อมูลทั้งหมด',
      nzContent: Modal2Component,
      nzFooter: null
    });

    const instance = modal.getContentComponent();
    instance.data = { id: data.id };

    modal.afterClose.subscribe(() => {
      console.log('Modal closed');
    });
  }

  deleteRow(id: number): void {
    this.modal.confirm({
      nzTitle: 'คุณต้องการลบข้อมูลนี้หรือไม่?',
      nzContent: '<b>ข้อมูลนี้จะถูกลบอย่างถาวร</b>',
      nzOkText: 'ใช่',
      nzOkType: 'primary',
      nzCancelText: 'ไม่',
      nzOnOk: () => {
        this.appointmentService.deleteAppointmentStatus(id).subscribe(() => {
          this.filteredData = this.filteredData.filter(item => item.id !== id);
          this.selectedData = this.selectedData.filter(item => item.id !== id);
        }, error => {
          console.error('Error deleting appointment status:', error);
        });
      }
    });
  }

}
