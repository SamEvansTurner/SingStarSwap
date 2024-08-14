import { Component, OnInit } from '@angular/core';
import { PS2DataService } from '../ps2.data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  data: Array<any> = [];

  constructor(private dataService: PS2DataService) { }

  ngOnInit(): void {
    this.dataService.getData().subscribe(response => {
      if (typeof(response) == 'string') {
        var domParser = new DOMParser();
        var htmlElement = domParser.parseFromString(response, 'text/html');
        var tableObject = htmlElement.querySelector("table[id=files]")
        var dirs = tableObject?.querySelectorAll("a[class=d]")
        dirs?.forEach((item, iterator) => {
          if (item.innerHTML.toLowerCase().includes(this.dataService.folderFilter.toLowerCase())) {
            this.data.push(
              {
                name: item.innerHTML + '\n',
                href: this.dataService.ps2MountURL + encodeURI(item.innerHTML)
              }
            )
          }
        }
        )
      }
    });
  }

  handleClick(item: any) {
    console.log(item.name)
    console.log(item.href)
  }
}
